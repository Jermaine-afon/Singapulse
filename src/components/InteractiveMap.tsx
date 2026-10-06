import React, { useState } from 'react';
import { Landmark } from '../types';
import { MapPin, Navigation, CloudRain, Sun, Shield, Info, ArrowUpRight, Umbrella } from 'lucide-react';

interface InteractiveMapProps {
  landmarks: Landmark[];
  selectedLandmark: Landmark | null;
  onSelectLandmark: (landmark: Landmark) => void;
  onGetDirections: (landmark: Landmark) => void;
  onCheckWeather: (landmark: Landmark) => void;
  userStartPointName: string;
}

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
  const [hoveredLandmark, setHoveredLandmark] = useState<Landmark | null>(null);

  // Conversion from Lat/Lng to SVG coordinates (Singapore bounding box)
  // Lat: 1.22 to 1.48 (North is smaller y)
  // Lng: 103.60 to 104.05 (East is larger x)
  const mapWidth = 900;
  const mapHeight = 520;
  const minLng = 103.62;
  const maxLng = 104.04;
  const minLat = 1.22;
  const maxLat = 1.47;

  const project = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * (mapWidth - 100) + 50;
    const y = ((maxLat - lat) / (maxLat - minLat)) * (mapHeight - 100) + 50;
    return { x, y };
  };

  const filteredLandmarks = selectedRegion === 'All'
    ? landmarks
    : landmarks.filter((lm) => lm.region === selectedRegion);

  // Start point coordinates (Marina Bay / Downtown baseline)
  const startCoords = project(1.2834, 103.8598);

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

      {/* SVG Map Canvas */}
      <div className="relative bg-[#f1f5f9] overflow-hidden select-none" style={{ minHeight: '440px' }}>
        
        {/* Ambient Map Water Grid Pattern */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px]" />

        <svg
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          className="w-full h-auto max-h-[560px] object-contain drop-shadow-sm"
        >
          <defs>
            {/* Gradient for landmass */}
            <linearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>

            {/* Simulated Radar Rain Cloud Gradient */}
            <radialGradient id="rainRadarWest" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.45)" />
              <stop offset="60%" stopColor="rgba(16, 185, 129, 0.25)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
            </radialGradient>

            <radialGradient id="rainRadarCentral" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(147, 51, 234, 0.35)" />
              <stop offset="70%" stopColor="rgba(59, 130, 246, 0.15)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
            </radialGradient>
          </defs>

          {/* Water boundary / Straits of Johor & Singapore */}
          <rect width={mapWidth} height={mapHeight} fill="#e2e8f0" />

          {/* Singapore Main Island Stylized Contour */}
          <path
            d="M 120 220 
               C 150 160, 240 120, 380 125
               C 470 128, 560 140, 680 180
               C 780 210, 830 250, 810 290
               C 780 340, 710 370, 620 380
               C 550 385, 480 395, 430 405
               C 350 420, 260 410, 190 380
               C 130 350, 80 310, 95 260
               Z"
            fill="url(#landGradient)"
            stroke="#cbd5e1"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Sentosa Island */}
          <ellipse
            cx="440"
            cy="445"
            rx="55"
            ry="20"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />

          {/* Pulau Ubin Island (North-East) */}
          <path
            d="M 720 145 C 750 135, 800 140, 820 160 C 800 175, 750 170, 720 160 Z"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />

          {/* Major Expressways / Arteries (OneMap routing framework) */}
          <path
            d="M 160 270 Q 420 320 780 250"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="3"
            strokeDasharray="4 4"
          />
          <path
            d="M 430 140 Q 460 270 450 390"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="2.5"
            strokeDasharray="4 4"
          />

          {/* Simulated Rain Radar Layers (if active) */}
          {showRadar && (
            <g className="transition-opacity duration-500">
              {/* West / Jurong Afternoon Shower Cell */}
              <circle cx="260" cy="270" r="110" fill="url(#rainRadarWest)" />
              {/* Central Convection Cell */}
              <circle cx="460" cy="300" r="85" fill="url(#rainRadarCentral)" />
              
              <text x="210" y="275" fill="#1e40af" fontSize="11" fontWeight="600" opacity="0.8">
                🌧️ Shower Cell (12-18mm/h)
              </text>
              <text x="640" y="280" fill="#047857" fontSize="11" fontWeight="600" opacity="0.8">
                ☀️ Fair Coastal Zone (29°C)
              </text>
            </g>
          )}

          {/* Route Line if landmark selected */}
          {selectedLandmark && (
            <g>
              {(() => {
                const destCoords = project(selectedLandmark.latitude, selectedLandmark.longitude);
                return (
                  <>
                    <path
                      d={`M ${startCoords.x} ${startCoords.y} Q ${(startCoords.x + destCoords.x) / 2} ${
                        (startCoords.y + destCoords.y) / 2 - 25
                      } ${destCoords.x} ${destCoords.y}`}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="3.5"
                      strokeDasharray="6 4"
                      className="animate-pulse"
                    />
                    {/* User Origin Pin */}
                    <circle cx={startCoords.x} cy={startCoords.y} r="6" fill="#0f172a" />
                    <circle cx={startCoords.x} cy={startCoords.y} r="12" fill="none" stroke="#0f172a" strokeWidth="1.5" opacity="0.4" />
                    <text
                      x={startCoords.x + 10}
                      y={startCoords.y + 4}
                      fill="#0f172a"
                      fontSize="10"
                      fontWeight="700"
                    >
                      Start: {userStartPointName}
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {/* Landmarks Pinned on the Map */}
          {filteredLandmarks.map((lm) => {
            const { x, y } = project(lm.latitude, lm.longitude);
            const isSelected = selectedLandmark?.id === lm.id;
            const isHovered = hoveredLandmark?.id === lm.id;
            const pinColor = getPinColor(lm.category);

            return (
              <g
                key={lm.id}
                className="cursor-pointer transition-transform duration-200"
                onClick={() => onSelectLandmark(lm)}
                onMouseEnter={() => setHoveredLandmark(lm)}
                onMouseLeave={() => setHoveredLandmark(null)}
              >
                {/* Glow ring on hover/selected */}
                {(isSelected || isHovered) && (
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? "18" : "14"}
                    fill={pinColor}
                    opacity="0.25"
                    className="animate-ping"
                  />
                )}

                {/* Pin base circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? "9" : "7"}
                  fill={pinColor}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="drop-shadow-md"
                />

                {/* Shelter indicator dot if full shelter */}
                {lm.shelterLevel === 'full_shelter' && (
                  <circle cx={x + 5} cy={y - 5} r="3" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                )}

                {/* Landmark Label */}
                <text
                  x={x}
                  y={y + (isSelected ? 20 : 16)}
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize={isSelected ? "11" : "9.5"}
                  fontWeight={isSelected ? "700" : "500"}
                  className="drop-shadow-sm select-none pointer-events-none"
                >
                  {lm.name.split(' ')[0]} {lm.name.split(' ')[1] || ''}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Map Legend */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-xl p-3 shadow-md text-xs space-y-1.5 max-w-[210px] hidden sm:block">
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
          <div className="absolute bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:max-w-md bg-white border border-slate-200 rounded-xl p-4 shadow-xl text-slate-800">
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
          <span>Coordinates match OneMap Singapore Elastic Search Geodetic data.</span>
        </span>
        <span className="font-mono text-slate-600">
          Showing {filteredLandmarks.length} off-the-beaten-path locations
        </span>
      </div>

    </div>
  );
};
