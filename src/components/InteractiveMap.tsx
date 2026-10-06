import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import 'leaflet/dist/leaflet.css';
import { Landmark, StartPoint } from '../types';
import { Navigation, Sun, Umbrella, X, Info, TrainFront } from 'lucide-react';

interface InteractiveMapProps {
  landmarks: Landmark[];
  selectedLandmark: Landmark | null;
  onSelectLandmark: (landmark: Landmark) => void;
  onGetDirections: (landmark: Landmark) => void;
  onCheckWeather: (landmark: Landmark) => void;
  onSelectForDetails?: (landmark: Landmark) => void;
  startPoint: StartPoint;
}

// OneMap (Singapore Land Authority) basemap — public tiles, no token required.
// https://www.onemap.gov.sg/docs/maps/
const ONEMAP_TILE_URL = 'https://www.onemap.gov.sg/maps/tiles/Grey/{z}/{x}/{y}.png';
const ONEMAP_ATTRIBUTION =
  '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;display:inline;vertical-align:middle"/>&nbsp;' +
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;' +
  '<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>';

const SG_CENTER: [number, number] = [1.3521, 103.8198];
const SG_MAX_BOUNDS = L.latLngBounds([1.144, 103.535], [1.494, 104.1]);

// Pins stop clustering from this zoom on, so close neighbours become individually clickable
const CLUSTER_MAX_ZOOM = 15;
const CLUSTER_RADIUS_PX = 64;
// The selected place's name stays visible only once zoomed in, so the overview stays clean
const LABEL_MIN_ZOOM = 14;

type Category = Landmark['category'];

const CATEGORIES: { id: Category; label: string; color: string }[] = [
  { id: 'architecture', label: 'Architecture', color: '#0e0f0c' },
  { id: 'heritage', label: 'Heritage', color: '#b86700' },
  { id: 'greenery', label: 'Greenery & trails', color: '#2ead4b' },
  { id: 'eats_culture', label: 'Eats & culture', color: '#d03238' },
  { id: 'coastal', label: 'Coast & islands', color: '#0b7fae' },
];
const pinColor = (category: Category) => CATEGORIES.find((c) => c.id === category)?.color ?? '#454745';

const REGIONS = ['Central', 'East', 'West', 'North', 'South'] as const;

// ---------- Icons (cached so markers don't rebuild their DOM on every render) ----------

const iconCache = new Map<string, L.DivIcon>();

const pinIcon = (color: string, selected: boolean) => {
  const key = `pin|${color}|${selected}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const size = selected ? 20 : 14;
    icon = L.divIcon({
      className: 'sg-pin',
      html: `${selected ? `<span class="sg-pin-ring" style="background:${color}"></span>` : ''}<span class="sg-pin-dot" style="background:${color}"></span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      tooltipAnchor: [0, size / 2],
    });
    iconCache.set(key, icon);
  }
  return icon;
};

const clusterIcon = (count: number) => {
  const key = `cluster|${count}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const size = count < 10 ? 34 : count < 25 ? 40 : 48;
    icon = L.divIcon({
      className: 'sg-pin',
      html: `<span class="sg-cluster" style="width:${size}px;height:${size}px">${count}</span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    iconCache.set(key, icon);
  }
  return icon;
};

const startIcon = L.divIcon({
  className: 'sg-pin',
  html: '<span class="sg-start-dot"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  tooltipAnchor: [0, -8],
});

// ---------- Map behaviour ----------

/** Re-fits the view when the filter set changes, and flies to a newly selected place. */
const MapFocus: React.FC<{ selected: Landmark | null; filterKey: string; visible: Landmark[] }> = ({
  selected,
  filterKey,
  visible,
}) => {
  const map = useMap();
  const prevSelectedId = useRef(selected?.id);

  useEffect(() => {
    if (visible.length === 0) return;
    const bounds = L.latLngBounds(visible.map((lm) => [lm.latitude, lm.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    // Only when the filters change, not on every list identity change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, map]);

  useEffect(() => {
    if (!selected || selected.id === prevSelectedId.current) return;
    prevSelectedId.current = selected.id;
    map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), CLUSTER_MAX_ZOOM), { duration: 0.8 });
  }, [selected, map]);

  return null;
};

type PinFeature = GeoJSON.Feature<GeoJSON.Point, { id: string }>;

/** Draws clusters at low zoom and individual pins once zoomed in. */
const ClusteredPins: React.FC<{
  landmarks: Landmark[];
  selectedId: string | null;
  onSelect: (landmark: Landmark) => void;
}> = ({ landmarks, selectedId, onSelect }) => {
  const map = useMap();
  const [view, setView] = useState(() => ({ bounds: map.getBounds(), zoom: map.getZoom() }));
  useMapEvents({
    moveend: () => setView({ bounds: map.getBounds(), zoom: map.getZoom() }),
  });

  const byId = useMemo(() => new Map(landmarks.map((lm) => [lm.id, lm])), [landmarks]);

  // The selected place is drawn on its own, above everything, so it never hides inside a cluster
  const index = useMemo(() => {
    const cluster = new Supercluster<{ id: string }>({ radius: CLUSTER_RADIUS_PX, maxZoom: CLUSTER_MAX_ZOOM - 1 });
    const points: PinFeature[] = landmarks
      .filter((lm) => lm.id !== selectedId)
      .map((lm) => ({
        type: 'Feature',
        properties: { id: lm.id },
        geometry: { type: 'Point', coordinates: [lm.longitude, lm.latitude] },
      }));
    cluster.load(points);
    return cluster;
  }, [landmarks, selectedId]);

  const { bounds, zoom } = view;
  const items = index.getClusters([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()], Math.round(zoom));
  const selected = selectedId ? byId.get(selectedId) : undefined;

  return (
    <>
      {items.map((item) => {
        const [lng, lat] = item.geometry.coordinates;
        const props = item.properties as { cluster?: boolean; cluster_id?: number; point_count?: number; id?: string };
        if (props.cluster && props.cluster_id !== undefined) {
          const clusterId = props.cluster_id;
          const count = props.point_count ?? 0;
          return (
            <Marker
              key={`cluster-${clusterId}`}
              position={[lat, lng]}
              icon={clusterIcon(count)}
              eventHandlers={{
                click: () =>
                  map.flyTo([lat, lng], Math.min(index.getClusterExpansionZoom(clusterId), CLUSTER_MAX_ZOOM), {
                    duration: 0.6,
                  }),
              }}
            >
              <Tooltip direction="top" offset={[0, -18]} className="sg-pin-label">
                {count} places, zoom in to see them
              </Tooltip>
            </Marker>
          );
        }
        const lm = props.id ? byId.get(props.id) : undefined;
        if (!lm) return null;
        return (
          <Marker
            key={lm.id}
            position={[lat, lng]}
            icon={pinIcon(pinColor(lm.category), false)}
            eventHandlers={{ click: () => onSelect(lm) }}
          >
            <Tooltip direction="top" offset={[0, -8]} className="sg-pin-label">
              {lm.name}
            </Tooltip>
          </Marker>
        );
      })}

      {selected && (
        <Marker
          key={`selected-${selected.id}`}
          position={[selected.latitude, selected.longitude]}
          icon={pinIcon(pinColor(selected.category), true)}
          zIndexOffset={1000}
        >
          <Tooltip
            // permanent can't change after mount, so key the tooltip on it
            key={zoom >= LABEL_MIN_ZOOM ? 'label-on' : 'label-off'}
            permanent={zoom >= LABEL_MIN_ZOOM}
            direction="top"
            offset={[0, -12]}
            className="sg-pin-label"
          >
            {selected.name}
          </Tooltip>
        </Marker>
      )}
    </>
  );
};

// ---------- Component ----------

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  landmarks,
  selectedLandmark,
  onSelectLandmark,
  onGetDirections,
  onCheckWeather,
  onSelectForDetails,
  startPoint,
}) => {
  const [categories, setCategories] = useState<Category[]>([]); // empty = all
  const [region, setRegion] = useState<string>('All');
  // The card opens only after the visitor picks a place here (not for the app's default selection)
  const [cardOpen, setCardOpen] = useState(false);
  const initialSelectedId = useRef(selectedLandmark?.id);
  useEffect(() => {
    if (selectedLandmark?.id && selectedLandmark.id !== initialSelectedId.current) {
      initialSelectedId.current = undefined;
      setCardOpen(true);
    }
  }, [selectedLandmark?.id]);

  const visible = useMemo(
    () =>
      landmarks.filter(
        (lm) => (categories.length === 0 || categories.includes(lm.category)) && (region === 'All' || lm.region === region)
      ),
    [landmarks, categories, region]
  );

  const toggleCategory = (id: Category) =>
    setCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const filterKey = `${categories.join(',')}|${region}`;
  const showCard = selectedLandmark && cardOpen;
  const hasMrt = selectedLandmark && selectedLandmark.nearestMrt && !/^nearby/i.test(selectedLandmark.nearestMrt);

  return (
    <section aria-labelledby="map-heading" className="space-y-6">
      {/* Header */}
      <div className="max-w-xl">
        <h2 id="map-heading" className="display text-ink text-3xl sm:text-4xl">
          Map
        </h2>
        <p className="text-body text-base mt-3">See where places sit in the city. Tap a number to zoom in, or a pin for details.</p>
      </div>

      {/* Filters: the category chips double as the legend */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show categories">
          <button type="button" onClick={() => setCategories([])} aria-pressed={categories.length === 0} className="chip">
            All places
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" onClick={() => toggleCategory(c.id)} aria-pressed={categories.includes(c.id)} className="chip">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-canvas" style={{ background: c.color }} aria-hidden="true" />
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="sr-only" htmlFor="map-region">
            Area
          </label>
          <select id="map-region" value={region} onChange={(e) => setRegion(e.target.value)} className="input !min-h-10 !py-2 w-40">
            <option value="All">All areas</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <span className="text-sm text-body nums whitespace-nowrap">
            {visible.length} {visible.length === 1 ? 'place' : 'places'}
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="relative isolate rounded-3xl overflow-hidden bg-canvas">
        <MapContainer
          center={SG_CENTER}
          zoom={12}
          minZoom={11}
          maxZoom={19}
          maxBounds={SG_MAX_BOUNDS}
          maxBoundsViscosity={1}
          scrollWheelZoom
          // Background matches OneMap's sea colour so areas outside tile coverage blend in
          className="h-[480px] sm:h-[620px] w-full !bg-[#d1d1d1]"
        >
          <TileLayer url={ONEMAP_TILE_URL} attribution={ONEMAP_ATTRIBUTION} detectRetina />
          <MapFocus selected={selectedLandmark} filterKey={filterKey} visible={visible} />

          <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon} zIndexOffset={900}>
            <Tooltip direction="top" className="sg-start-label">
              Your start: {startPoint.name}
            </Tooltip>
          </Marker>

          <ClusteredPins
            landmarks={visible}
            selectedId={selectedLandmark && visible.some((lm) => lm.id === selectedLandmark.id) ? selectedLandmark.id : null}
            onSelect={onSelectLandmark}
          />
        </MapContainer>

        {visible.length === 0 && (
          <div className="absolute inset-x-4 top-4 z-[1000] mx-auto max-w-sm rounded-2xl bg-canvas px-4 py-3 text-sm text-body flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
            No places match these filters.
          </div>
        )}

        {/* Selected place: compact card, dismissible so it never blocks the map */}
        {showCard && (
          <div className="relative sm:absolute sm:bottom-10 sm:left-4 sm:w-80 z-[1000] bg-canvas sm:rounded-2xl p-4 text-ink animate-rise sm:shadow-[0_8px_24px_rgb(14_15_12/0.14)]">
            <button
              type="button"
              onClick={() => setCardOpen(false)}
              aria-label="Close place card"
              className="btn btn-icon btn-ghost !w-9 !h-9 !min-h-9 absolute top-2 right-2"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
            <h3 className="text-lg font-semibold leading-snug pr-8">
              {onSelectForDetails ? (
                <button
                  type="button"
                  onClick={() => onSelectForDetails(selectedLandmark)}
                  className="text-left cursor-pointer hover:underline decoration-2 underline-offset-4"
                >
                  {selectedLandmark.name}
                </button>
              ) : (
                selectedLandmark.name
              )}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-body">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pinColor(selectedLandmark.category) }} aria-hidden="true" />
              <span>{selectedLandmark.neighborhood}</span>
            </p>
            {hasMrt && (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-body">
                <TrainFront className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="line-clamp-2">{selectedLandmark.nearestMrt}</span>
              </p>
            )}
            {selectedLandmark.shelterLevel === 'full_shelter' && (
              <span className="badge badge-sm badge-positive mt-2">
                <Umbrella className="w-3.5 h-3.5" aria-hidden="true" />
                Rain-safe
              </span>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button type="button" onClick={() => onGetDirections(selectedLandmark)} className="btn btn-sm btn-primary">
                <Navigation className="w-4 h-4" aria-hidden="true" />
                Get there
              </button>
              <button type="button" onClick={() => onCheckWeather(selectedLandmark)} className="btn btn-sm btn-secondary">
                <Sun className="w-4 h-4" aria-hidden="true" />
                Weather
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
