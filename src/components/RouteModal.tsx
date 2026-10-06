import React, { useEffect, useState } from 'react';
import { Landmark, RouteDetail, StartPoint } from '../types';
import { calculateMockRoute } from '../data/mockRouteEngine';
import { StartPointPicker } from './StartPointPicker';
import { X, Footprints, Train, Bike, Car, Umbrella, Info } from 'lucide-react';

interface RouteModalProps {
  landmark: Landmark | null;
  onClose: () => void;
  userStartPoint: StartPoint;
  onStartPointChange: (point: StartPoint) => void;
}

type Mode = 'walk' | 'pt' | 'cycle' | 'drive';

const MODES: { id: Mode; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'walk', label: 'Walk', Icon: Footprints },
  { id: 'pt', label: 'MRT & bus', Icon: Train },
  { id: 'cycle', label: 'Cycle', Icon: Bike },
  { id: 'drive', label: 'Taxi / Grab', Icon: Car },
];

export const RouteModal: React.FC<RouteModalProps> = ({
  landmark,
  onClose,
  userStartPoint,
  onStartPointChange,
}) => {
  const [mode, setMode] = useState<Mode>('walk');
  const isOpen = landmark !== null;

  // Escape to close + body scroll lock while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!landmark) return null;

  // Base route calculation
  const route: RouteDetail = calculateMockRoute(userStartPoint.name, landmark, mode);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 flex items-center justify-center p-4 sm:p-6 animate-fade"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-modal-title"
        className="bg-canvas rounded-3xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="route-modal-title" className="display text-ink text-3xl">
              Getting there
            </h2>
            <p className="text-base text-body mt-2">To {landmark.name}</p>
            <p className="badge badge-sm badge-warning mt-3 whitespace-normal">
              <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Estimated route — times, fares and sheltered % are approximate
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close route estimate"
            className="btn btn-icon btn-ghost shrink-0 -mr-2 -mt-1"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* Start point & mode */}
          <div className="px-6 pb-5 space-y-4">
            <StartPointPicker value={userStartPoint} onChange={onStartPointChange} />

            <div className="flex flex-wrap gap-2" role="group" aria-label="Travel mode">
              {MODES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  aria-pressed={mode === id}
                  className="chip"
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <dl className="mx-6 card-soft !p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm text-mute">Time</dt>
              <dd className="text-xl font-semibold text-ink nums">~{route.durationMinutes} min</dd>
            </div>
            <div>
              <dt className="text-sm text-mute">Distance</dt>
              <dd className="text-xl font-semibold text-ink nums">{route.distanceKm} km</dd>
            </div>
            <div>
              <dt className="text-sm text-mute">Sheltered</dt>
              <dd className="text-xl font-semibold text-ink nums flex items-center gap-1.5">
                <Umbrella className="w-4 h-4 text-positive-deep" aria-hidden="true" />
                <span>{route.coveredWalkwayPct}%</span>
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-sm text-mute">Cost</dt>
              <dd className="text-base font-semibold text-ink nums mt-0.5 break-words">{route.fareOrCost}</dd>
            </div>
          </dl>

          {/* Steps */}
          <div className="px-6 py-5">
            <h3 className="text-lg font-semibold text-ink mb-2">Steps</h3>
            <ol className="divide-y divide-canvas-line">
              {route.steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3 py-3">
                  <span className="w-7 h-7 rounded-full bg-canvas-soft text-ink text-sm font-semibold nums flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-ink leading-snug">{step.instruction}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-mute mt-1">
                      <span className="nums">{step.distanceMeters} m</span>
                      <span aria-hidden="true">·</span>
                      <span className="nums">~{step.durationMinutes} min</span>
                      {step.isCoveredWalkway && (
                        <span className="badge badge-sm badge-positive">
                          <Umbrella className="w-3 h-3" aria-hidden="true" />
                          Sheltered
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-canvas-line flex items-center justify-between gap-3">
          <span className="text-sm text-mute">Check live transport apps before you set off.</span>
          <button type="button" onClick={onClose} className="btn btn-sm btn-dark shrink-0">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
