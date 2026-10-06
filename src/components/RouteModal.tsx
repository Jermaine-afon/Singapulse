import React, { useState } from 'react';
import { Landmark, RouteDetail } from '../types';
import { calculateMockRoute } from '../data/mockRouteEngine';
import { POPULAR_START_POINTS } from '../data/landmarks';
import {
  X,
  Navigation,
  Footprints,
  Train,
  Bike,
  Car,
  Umbrella,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin
} from 'lucide-react';

interface RouteModalProps {
  landmark: Landmark | null;
  onClose: () => void;
  userStartPoint: string;
  onStartPointChange: (name: string) => void;
}

export const RouteModal: React.FC<RouteModalProps> = ({
  landmark,
  onClose,
  userStartPoint,
  onStartPointChange,
}) => {
  const [mode, setMode] = useState<'walk' | 'pt' | 'cycle' | 'drive'>('walk');

  if (!landmark) return null;

  // Base route calculation
  const route: RouteDetail = calculateMockRoute(userStartPoint, landmark, mode);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              <span>OneMap Singapore Routing & Spatial Engine</span>
            </div>
            <h3 className="text-lg font-bold font-display text-white mt-0.5">
              Directions to {landmark.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Start Point & Transit Controls */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 space-y-4">
          
          {/* Start Point Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>Starting Location / Accommodation</span>
            </label>

            <div className="flex gap-2">
              <select
                value={userStartPoint}
                onChange={(e) => onStartPointChange(e.target.value)}
                className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
              >
                {POPULAR_START_POINTS.map((sp) => (
                  <option key={sp.name} value={sp.name}>
                    {sp.name} ({sp.zone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setMode('walk')}
              className={`cursor-pointer py-2 px-2 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
                mode === 'walk'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Footprints className="w-4 h-4" />
              <span>Walk</span>
            </button>

            <button
              onClick={() => setMode('pt')}
              className={`cursor-pointer py-2 px-2 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
                mode === 'pt'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Train className="w-4 h-4" />
              <span>MRT & Bus</span>
            </button>

            <button
              onClick={() => setMode('cycle')}
              className={`cursor-pointer py-2 px-2 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
                mode === 'cycle'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>Cycle</span>
            </button>

            <button
              onClick={() => setMode('drive')}
              className={`cursor-pointer py-2 px-2 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
                mode === 'drive'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Taxi / Grab</span>
            </button>
          </div>

        </div>

        {/* Route Summary Metrics Strip */}
        <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-around text-center text-xs">
          <div>
            <span className="text-slate-500 block">Est. Duration</span>
            <span className="font-bold text-slate-900 font-mono text-base tabular-nums">
              {route.durationMinutes} mins
            </span>
          </div>
          <div className="h-6 w-px bg-emerald-200" />
          <div>
            <span className="text-slate-500 block">Distance</span>
            <span className="font-bold text-slate-900 font-mono text-base tabular-nums">
              {route.distanceKm} km
            </span>
          </div>
          <div className="h-6 w-px bg-emerald-200" />
          <div>
            <span className="text-slate-500 block">Sheltered Linkways</span>
            <span className="font-bold text-emerald-800 font-mono text-base tabular-nums flex items-center justify-center gap-1">
              <Umbrella className="w-3.5 h-3.5 text-emerald-600" />
              <span>{route.coveredWalkwayPct}%</span>
            </span>
          </div>
          <div className="h-6 w-px bg-emerald-200" />
          <div>
            <span className="text-slate-500 block">Transit Cost</span>
            <span className="font-bold text-slate-900 text-xs mt-0.5 block truncate max-w-[100px]">
              {route.fareOrCost}
            </span>
          </div>
        </div>

        {/* Turn-by-Turn Guidance */}
        <div className="p-5 overflow-y-auto space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Step-by-Step Navigation Guidance
          </div>

          {route.steps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition"
            >
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs sm:text-sm text-slate-800 font-medium leading-snug">
                  {step.instruction}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span>{step.distanceMeters}m</span>
                  <span>·</span>
                  <span>~{step.durationMinutes} mins</span>
                  {step.isCoveredWalkway && (
                    <span className="text-emerald-700 font-sans font-medium flex items-center gap-1">
                      <Umbrella className="w-3 h-3 text-emerald-600" />
                      <span>Sheltered Link</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>OneMap Singapore Spatial Engine & Covered Walkway Network</span>
          </span>
          <button
            onClick={onClose}
            className="cursor-pointer px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
