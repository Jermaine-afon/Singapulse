import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Landmark } from '../types';
import { POPULAR_START_POINTS } from '../data/landmarks';
import { Navigation, CloudRain, Sun, Umbrella } from 'lucide-react';

interface InteractiveMapProps {
  landmarks: Landmark[];
  selectedLandmark: Landmark | null;
  onSelectLandmark: (landmark: Landmark) => void;
  onGetDirections: (landmark: Landmark) => void;
  onCheckWeather: (landmark: Landmark) => void;
  userStartPointName: string;
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

// Fallback start point (Marina Bay / Downtown baseline)
const DEFAULT_START: [number, number] = [1.2834, 103.8598];

const getPinColor = (category: Landmark['category']) => {
  switch (category) {
    case 'architecture':
      return '#0e0f0c'; // ink
    case 'heritage':
      return '#b86700'; // warning-deep
    case 'greenery':
      return '#2ead4b'; // positive
    case 'eats_culture':
      return '#d03238'; // negative
    case 'coastal':
      return '#0b7fae'; // deep cyan
    default:
      return '#454745'; // body
  }
};

const LEGEND: { category: Landmark['category']; label: string }[] = [
  { category: 'architecture', label: 'Architecture' },
  { category: 'heritage', label: 'Heritage' },
  { category: 'greenery', label: 'Greenery & trails' },
  { category: 'eats_culture', label: 'Eats & culture' },
  { category: 'coastal', label: 'Coast & islands' },
];

const REGIONS = ['All', 'Central', 'East', 'West', 'North', 'South'];

// Cache pin icons so markers don't rebuild their DOM on every render
const pinIconCache = new Map<string, L.DivIcon>();
const getPinIcon = (color: string, isSelected: boolean, isHovered: boolean, isSheltered: boolean) => {
  const key = `${color}|${isSelected}|${isHovered}|${isSheltered}`;
  const cached = pinIconCache.get(key);
  if (cached) return cached;

  const size = isSelected ? 18 : isHovered ? 16 : 14;
  const icon = L.divIcon({
    className: 'sg-pin',
    html:
      `${isSelected || isHovered ? `<span class="sg-pin-ring" style="background:${color}"></span>` : ''}` +
      `<span class="sg-pin-dot" style="background:${color}"></span>` +
      `${isSheltered ? '<span class="sg-pin-shelter"></span>' : ''}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, size / 2],
  });
  pinIconCache.set(key, icon);
  return icon;
};

const startIcon = L.divIcon({
  className: 'sg-pin',
  html: '<span class="sg-start-dot"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  tooltipAnchor: [8, 0],
});

// Moves the map when the region filter or the selected landmark changes
const MapFocus: React.FC<{
  selected: Landmark | null;
  region: string;
  regionLandmarks: Landmark[];
}> = ({ selected, region, regionLandmarks }) => {
  const map = useMap();
  const prevSelectedId = useRef(selected?.id);

  useEffect(() => {
    if (regionLandmarks.length === 0) return;
    const bounds = L.latLngBounds(regionLandmarks.map((lm) => [lm.latitude, lm.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    // Only refit when the region changes, not on every landmark list identity change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, map]);

  useEffect(() => {
    if (!selected || selected.id === prevSelectedId.current) return;
    prevSelectedId.current = selected.id;
    map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [selected, map]);

  return null;
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  landmarks,
  selectedLandmark,
  onSelectLandmark,
  onGetDirections,
  onCheckWeather,
  userStartPointName,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [showRadar, setShowRadar] = useState(true);
  const [hoveredLandmarkId, setHoveredLandmarkId] = useState<string | null>(null);

  const filteredLandmarks = useMemo(
    () => (selectedRegion === 'All' ? landmarks : landmarks.filter((lm) => lm.region === selectedRegion)),
    [landmarks, selectedRegion]
  );

  const startPoint = POPULAR_START_POINTS.find((sp) => sp.name === userStartPointName);
  const startCoords: [number, number] = startPoint ? [startPoint.lat, startPoint.lng] : DEFAULT_START;

  return (
    <section aria-labelledby="map-heading" className="space-y-6">
      {/* Header */}
      <div className="space-y-5">
        <div className="max-w-xl">
          <h2 id="map-heading" className="display text-ink text-3xl sm:text-4xl">
            Map
          </h2>
          <p className="text-body text-base mt-3">
            Find every place on one map, see where it sits in the city and get there from your start point.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {REGIONS.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => setSelectedRegion(region)}
              aria-pressed={selectedRegion === region}
              className="chip"
            >
              {region}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowRadar(!showRadar)}
            aria-pressed={showRadar}
            className="chip sm:ml-auto"
          >
            <CloudRain className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            <span>Rain radar (simulated)</span>
          </button>
        </div>
      </div>

      {/* Map Canvas */}
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
          className="h-[440px] sm:h-[560px] w-full !bg-[#d1d1d1]"
        >
          <TileLayer url={ONEMAP_TILE_URL} attribution={ONEMAP_ATTRIBUTION} detectRetina />

          <MapFocus selected={selectedLandmark} region={selectedRegion} regionLandmarks={filteredLandmarks} />

          {/* Simulated Rain Radar Layers (if active) */}
          {showRadar && (
            <>
              {/* West / Jurong Afternoon Shower Cell */}
              <Circle
                center={[1.3404, 103.7200]}
                radius={7000}
                pathOptions={{ color: '#0b7fae', weight: 0, fillColor: '#0b7fae', fillOpacity: 0.22 }}
              >
                <Tooltip permanent direction="center" className="sg-radar-label sg-radar-label--rain">
                  Simulated shower (12–18 mm/h)
                </Tooltip>
              </Circle>
              {/* Central Convection Cell */}
              <Circle
                center={[1.3150, 103.8400]}
                radius={4500}
                pathOptions={{ color: '#0b4f6c', weight: 0, fillColor: '#0b4f6c', fillOpacity: 0.14 }}
              />
              {/* Fair coastal zone (East) */}
              <Circle
                center={[1.3236, 103.9500]}
                radius={10}
                pathOptions={{ opacity: 0, fillOpacity: 0 }}
              >
                <Tooltip permanent direction="center" className="sg-radar-label sg-radar-label--fair">
                  Simulated fair zone (29°C)
                </Tooltip>
              </Circle>
            </>
          )}

          {/* Route Line if landmark selected */}
          {selectedLandmark && (
            <>
              <Polyline
                positions={[startCoords, [selectedLandmark.latitude, selectedLandmark.longitude]]}
                pathOptions={{ color: '#0e0f0c', weight: 3, dashArray: '6 6' }}
              />
              <Marker position={startCoords} icon={startIcon} interactive={false}>
                <Tooltip permanent direction="top" offset={[0, -6]} className="sg-start-label">
                  Start: {userStartPointName}
                </Tooltip>
              </Marker>
            </>
          )}

          {/* Landmarks Pinned on the Map */}
          {filteredLandmarks.map((lm) => {
            const isSelected = selectedLandmark?.id === lm.id;
            const isHovered = hoveredLandmarkId === lm.id;

            return (
              <Marker
                // Tooltip `permanent` can't change after mount, so remount the marker when selection flips
                key={`${lm.id}-${isSelected}`}
                position={[lm.latitude, lm.longitude]}
                icon={getPinIcon(getPinColor(lm.category), isSelected, isHovered, lm.shelterLevel === 'full_shelter')}
                zIndexOffset={isSelected ? 1000 : isHovered ? 500 : 0}
                eventHandlers={{
                  click: () => onSelectLandmark(lm),
                  mouseover: () => setHoveredLandmarkId(lm.id),
                  mouseout: () => setHoveredLandmarkId((id) => (id === lm.id ? null : id)),
                }}
              >
                <Tooltip permanent={isSelected} direction="bottom" offset={[0, 4]} className="sg-pin-label">
                  {lm.name}
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute top-4 right-4 z-[1000] bg-canvas rounded-2xl p-4 max-w-[220px] hidden sm:block">
          <p className="text-sm font-semibold text-ink mb-2">Categories</p>
          <ul className="space-y-1.5 text-sm text-body">
            {LEGEND.map((item) => (
              <li key={item.category} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: getPinColor(item.category) }}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 pt-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-primary ring-[1.5px] ring-ink-deep" aria-hidden="true" />
              <span>Fully sheltered</span>
            </li>
          </ul>
        </div>

        {/* Selected landmark quick card */}
        {selectedLandmark && (
          <div className="relative sm:absolute sm:bottom-8 sm:right-4 sm:max-w-sm z-[1000] bg-canvas sm:rounded-2xl p-5 text-ink animate-rise">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xl font-semibold text-ink leading-tight">{selectedLandmark.name}</h3>
                <p className="text-sm text-mute mt-1">
                  {selectedLandmark.region} · {selectedLandmark.nearestMrt}
                </p>
                <p className="text-sm text-body line-clamp-2 mt-2">{selectedLandmark.subtitle}</p>
              </div>

              {selectedLandmark.shelterLevel === 'full_shelter' && (
                <span className="badge badge-sm badge-positive shrink-0">
                  <Umbrella className="w-3.5 h-3.5" aria-hidden="true" />
                  Rain-safe
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => onGetDirections(selectedLandmark)}
                className="btn btn-sm btn-primary flex-1"
              >
                <Navigation className="w-4 h-4" aria-hidden="true" />
                <span>Get there</span>
              </button>
              <button
                type="button"
                onClick={() => onCheckWeather(selectedLandmark)}
                className="btn btn-sm btn-secondary flex-1"
              >
                <Sun className="w-4 h-4" aria-hidden="true" />
                <span>Weather</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-mute">
        <span>Basemap © OneMap / Singapore Land Authority</span>
        <span className="nums">
          Showing {filteredLandmarks.length} {filteredLandmarks.length === 1 ? 'place' : 'places'}
        </span>
      </div>
    </section>
  );
};
