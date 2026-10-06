import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Landmark } from '../types';
import { POPULAR_START_POINTS } from '../data/landmarks';
import { Navigation, CloudRain, Sun, Info, Umbrella } from 'lucide-react';

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
const ONEMAP_TILE_URL = 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png';
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
      return '#6366f1'; // Indigo
    case 'heritage':
      return '#d97706'; // Amber
    case 'greenery':
      return '#059669'; // Emerald
    case 'eats_culture':
      return '#e11d48'; // Rose
    case 'coastal':
      return '#0284c7'; // Sky
    default:
      return '#475569';
  }
};

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
  const map = useMap();  const prevSelectedId = useRef(selected?.id);

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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

      {/* Top Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800">
            <span>Singapore Island Geospatial Map</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500 font-normal">OneMap Geocodes & Weather Grid</span>
          </div>
          <h2 className="text-xl font-bold font-display text-slate-900 mt-0.5">
            Interactive Landmark & Microclimate Explorer
          </h2>
        </div>

        {/* Region filter buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['All', 'Central', 'East', 'West', 'North', 'South'].map((region) => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`cursor-pointer px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedRegion === region
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {region}
            </button>
          ))}

          {/* Radar Overlay Toggle */}
          <button
            onClick={() => setShowRadar(!showRadar)}
            className={`cursor-pointer ml-1 px-3 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              showRadar
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5 text-blue-600" />
            <span>{showRadar ? 'Radar Layer: Active' : 'Show Rain Radar'}</span>
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative isolate">
        <MapContainer
          center={SG_CENTER}
          zoom={12}
          minZoom={11}
          maxZoom={19}
          maxBounds={SG_MAX_BOUNDS}
          maxBoundsViscosity={1}
          scrollWheelZoom
          // Background matches OneMap's sea colour so areas outside tile coverage blend in
          className="h-[440px] sm:h-[560px] w-full !bg-[#6da8e4]"
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
                pathOptions={{ color: '#3b82f6', weight: 0, fillColor: '#3b82f6', fillOpacity: 0.22 }}
              >
                <Tooltip permanent direction="center" className="sg-radar-label sg-radar-label--rain">
                  🌧️ Shower Cell (12-18mm/h)
                </Tooltip>
              </Circle>
              {/* Central Convection Cell */}
              <Circle
                center={[1.3150, 103.8400]}
                radius={4500}
                pathOptions={{ color: '#9333ea', weight: 0, fillColor: '#9333ea', fillOpacity: 0.16 }}
              />
              {/* Fair coastal zone (East) */}
              <Circle
                center={[1.3236, 103.9500]}
                radius={10}
                pathOptions={{ opacity: 0, fillOpacity: 0 }}
              >
                <Tooltip permanent direction="center" className="sg-radar-label sg-radar-label--fair">
                  ☀️ Fair Coastal Zone (29°C)
                </Tooltip>
              </Circle>
            </>
          )}

          {/* Route Line if landmark selected */}
          {selectedLandmark && (
            <>
              <Polyline
                positions={[startCoords, [selectedLandmark.latitude, selectedLandmark.longitude]]}
                pathOptions={{ color: '#059669', weight: 3.5, dashArray: '6 4' }}
              />
              <Marker position={startCoords} icon={startIcon} interactive={false}>
                <Tooltip permanent direction="right" className="sg-start-label">
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

        {/* Floating Map Legend */}
        <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-xl p-3 shadow-md text-xs space-y-1.5 max-w-[210px] hidden sm:block">
          <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">
            Category Legend
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
            <span className="text-slate-600">Architectural Wonders</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="text-slate-600">Heritage & Straits History</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span className="text-slate-600">Secret Greenery & Trails</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span className="text-slate-600">Alley Cafes & Eats</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
            <span className="text-slate-600">Coastal Islands</span>
          </div>
        </div>

        {/* Selected Landmark Quick Action Card on the Map */}
        {selectedLandmark && (
          <div className="absolute bottom-8 inset-x-4 sm:inset-x-auto sm:right-4 sm:max-w-md z-[1000] bg-white border border-slate-200 rounded-xl p-4 shadow-xl text-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <span>{selectedLandmark.region} Singapore</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedLandmark.nearestMrt}</span>
                </div>
                <h4 className="text-base font-bold font-display text-slate-900 mt-0.5">
                  {selectedLandmark.name}
                </h4>
                <p className="text-xs text-slate-600 line-clamp-1 mt-1">
                  {selectedLandmark.subtitle}
                </p>
              </div>

              {selectedLandmark.shelterLevel === 'full_shelter' && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                  <Umbrella className="w-3 h-3 text-emerald-600" />
                  <span>Rain-Safe</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => onCheckWeather(selectedLandmark)}
                className="cursor-pointer flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Forecast Weather</span>
              </button>

              <button
                onClick={() => onGetDirections(selectedLandmark)}
                className="cursor-pointer py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Route</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Footer Info */}
      <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Basemap and coordinates from OneMap Singapore (Singapore Land Authority).</span>
        </span>
        <span className="font-mono text-slate-600">
          Showing {filteredLandmarks.length} off-the-beaten-path locations
        </span>
      </div>

    </div>
  );
};
