import React, { useEffect, useState } from 'react';
import { Landmark, StartPoint } from '../types';
import type { BusArrival, CrowdLevel, LiveTransit, RouteResult, RouteStep, RouteStepKind, TravelMode } from '../types/route';
import { fetchRoute } from '../services/routeService';
import { fetchLiveTransit, liveQueryFor } from '../services/liveTransitService';
import { StartPointPicker } from './StartPointPicker';
import { X, Footprints, Train, Bike, Car, Bus, Info, Loader2, MapPin, Accessibility, AlertTriangle, Users } from 'lucide-react';

interface RouteModalProps {
  landmark: Landmark | null;
  onClose: () => void;
  userStartPoint: StartPoint;
  onStartPointChange: (point: StartPoint) => void;
}

const MODES: { id: TravelMode; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'pt', label: 'MRT & bus', Icon: Train },
  { id: 'walk', label: 'Walk', Icon: Footprints },
  { id: 'cycle', label: 'Cycle', Icon: Bike },
  { id: 'drive', label: 'Taxi / car', Icon: Car },
];

const STEP_ICONS: Record<RouteStepKind, React.ComponentType<{ className?: string }>> = {
  walk: Footprints,
  bus: Bus,
  rail: Train,
  cycle: Bike,
  drive: Car,
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

const LIVE_REFRESH_MS = 30_000;

const LOAD_LABELS: Record<NonNullable<BusArrival['load']>, string> = {
  seats: 'Seats available',
  standing: 'Standing room',
  limited: 'Very full',
};

const CROWD_BADGES: Record<CrowdLevel, { label: string; className: string }> = {
  low: { label: 'Platform quiet', className: 'badge-positive' },
  moderate: { label: 'Platform moderately busy', className: 'badge-warning' },
  high: { label: 'Platform busy', className: 'badge-negative' },
};

/** "Arriving · 7 min · 15 min" plus the first bus's load and accessibility */
const BusArrivalsLine: React.FC<{ arrivals: BusArrival[] }> = ({ arrivals }) => {
  if (arrivals.length === 0) return <p className="mt-1.5 text-sm text-body">No live arrival times right now.</p>;
  const [first] = arrivals;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="nums text-ink">
        {arrivals.map((bus, i) => (
          <span key={i} className={i === 0 ? 'font-semibold' : 'text-body'}>
            {i > 0 && <span className="text-mute"> · </span>}
            {bus.minutes === 0 ? 'Arriving' : `${bus.minutes} min`}
          </span>
        ))}
        {!first.live && <span className="text-body"> (scheduled)</span>}
      </span>
      {first.load && <span className="text-body">{LOAD_LABELS[first.load]}</span>}
      {first.wheelchair && (
        <span className="inline-flex items-center gap-1 text-body">
          <Accessibility className="w-3.5 h-3.5" aria-hidden="true" />
          Wheelchair accessible
        </span>
      )}
    </div>
  );
};

const formatDistance = (meters: number) => (meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`);

export const RouteModal: React.FC<RouteModalProps> = ({ landmark, onClose, userStartPoint, onStartPointChange }) => {
  const [mode, setMode] = useState<TravelMode>('pt');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [live, setLive] = useState<LiveTransit | null>(null);
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<Date | null>(null);
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

  // Fetch the route whenever the trip or mode changes; ignore stale responses
  useEffect(() => {
    if (!landmark) return;
    let cancelled = false;
    setIsLoading(true);
    fetchRoute(
      { lat: userStartPoint.lat, lng: userStartPoint.lng },
      { lat: landmark.latitude, lng: landmark.longitude },
      mode,
      landmark.name
    ).then((result) => {
      if (cancelled) return;
      setRoute(result);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [landmark, userStartPoint.lat, userStartPoint.lng, mode]);

  // Live LTA extras for transit routes, refreshed while the dialog stays open
  const liveQuery = route ? liveQueryFor(route) : null;
  useEffect(() => {
    setLive(null);
    if (!liveQuery) return;
    let cancelled = false;
    const load = async () => {
      const result = await fetchLiveTransit(liveQuery);
      if (cancelled) return;
      setLive(result);
      if (result) setLiveUpdatedAt(new Date());
    };
    load();
    const timer = setInterval(load, LIVE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [liveQuery]);

  if (!landmark) return null;

  const busArrivalsFor = (step: RouteStep) =>
    step.kind === 'bus' && step.stopCode && step.line ? live?.busArrivals[`${step.stopCode}:${step.line}`] : undefined;
  const crowdFor = (step: RouteStep) => (step.kind === 'rail' && step.stationCode ? live?.crowd[step.stationCode] : undefined);

  const isEstimate = route?.source === 'estimate';

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
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close directions"
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
                <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id} className="chip">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div aria-live="polite" aria-busy={isLoading}>
            {isLoading && !route ? (
              <div className="mx-6 mb-6 card-soft !p-5 flex items-center gap-3 text-body">
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                Finding a route…
              </div>
            ) : route ? (
              <div className={`transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
                {/* MRT disruptions on lines this route uses */}
                {live?.alerts.map((alert) => (
                  <div
                    key={alert.line}
                    role="alert"
                    className="mx-6 mb-3 flex items-start gap-3 rounded-2xl bg-negative-pale px-4 py-3 text-sm text-negative-darkest"
                  >
                    <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <div className="space-y-1">
                      <p className="font-semibold">{alert.lineName} disruption{alert.direction ? ` (towards ${alert.direction})` : ''}</p>
                      {alert.message && <p>{alert.message}</p>}
                      {alert.freeBus && <p>Free bus rides at stations {alert.freeBus.split(',').join(', ')}</p>}
                      {alert.freeShuttle && <p>Free shuttle at stations {alert.freeShuttle.split(',').join(', ')}</p>}
                    </div>
                  </div>
                ))}

                {/* Summary */}
                <dl className="mx-6 card-soft !p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <dt className="text-sm text-body">Time</dt>
                    <dd className="text-2xl font-black text-ink nums">
                      {isEstimate && '~'}
                      {formatDuration(route.durationMinutes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-body">Distance</dt>
                    <dd className="text-2xl font-black text-ink nums">
                      {isEstimate && '~'}
                      {route.distanceKm} km
                    </dd>
                  </div>
                  {route.mode === 'pt' && (route.fareSgd || route.transfers !== undefined) && (
                    <div className="col-span-2 sm:col-span-1">
                      <dt className="text-sm text-body">{route.fareSgd ? 'Fare' : 'Transfers'}</dt>
                      <dd className="text-2xl font-black text-ink nums">
                        {route.fareSgd ? `S$${route.fareSgd}` : route.transfers}
                      </dd>
                      {route.fareSgd && route.transfers !== undefined && (
                        <dd className="text-sm text-body">
                          {route.transfers === 0 ? 'No transfers' : `${route.transfers} transfer${route.transfers > 1 ? 's' : ''}`}
                        </dd>
                      )}
                    </div>
                  )}
                </dl>

                {/* Source */}
                {isEstimate ? (
                  <p className="mx-6 mt-3 flex items-start gap-2 rounded-2xl bg-warning-pale px-4 py-3 text-sm text-warning-content">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      Rough estimate from straight-line distance, not a real route.
                      {route.note && <> {route.note}</>}
                    </span>
                  </p>
                ) : (
                  <p className="mx-6 mt-3 text-sm text-body">
                    Route by OneMap{route.mode === 'pt' ? ' for departing now' : ''}.
                    {live && liveUpdatedAt && (
                      <>
                        {' '}
                        Live bus and train info from LTA, updated{' '}
                        {liveUpdatedAt.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' })}.
                      </>
                    )}
                  </p>
                )}

                {/* Steps */}
                {route.steps.length > 0 && (
                  <div className="px-6 py-5">
                    <h3 className="text-lg font-semibold text-ink mb-2">Steps</h3>
                    <ol className="divide-y divide-canvas-line">
                      {route.steps.map((step, idx) => {
                        const Icon = STEP_ICONS[step.kind];
                        const transit = step.kind === 'bus' || step.kind === 'rail';
                        return (
                          <li key={idx} className="flex items-start gap-3 py-3">
                            <span
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                transit ? 'bg-ink text-primary' : 'bg-canvas-soft text-ink'
                              }`}
                            >
                              <Icon className="w-4 h-4" aria-hidden="true" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-base text-ink leading-snug">{step.instruction}</p>
                              {(step.distanceMeters || step.durationMinutes) && (
                                <p className="text-sm text-body mt-1 nums">
                                  {[
                                    step.durationMinutes ? formatDuration(step.durationMinutes) : null,
                                    step.distanceMeters ? formatDistance(step.distanceMeters) : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              )}
                              {busArrivalsFor(step) && <BusArrivalsLine arrivals={busArrivalsFor(step)!} />}
                              {crowdFor(step) && (
                                <span className={`badge badge-sm mt-2 ${CROWD_BADGES[crowdFor(step)!].className}`}>
                                  <Users className="w-3.5 h-3.5" aria-hidden="true" />
                                  {CROWD_BADGES[crowdFor(step)!].label}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
                {route.steps.length === 0 && (
                  <p className="px-6 py-5 flex items-center gap-2 text-sm text-body">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    Step-by-step directions appear when live routing is available.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-canvas-line flex items-center justify-between gap-3">
          <span className="text-sm text-body">Check live transport apps before you set off.</span>
          <button type="button" onClick={onClose} className="btn btn-sm btn-dark shrink-0">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
