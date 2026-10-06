// Shared between the browser (RouteModal) and the server (server/routing.ts)

export type TravelMode = 'walk' | 'pt' | 'cycle' | 'drive';

export interface LatLng {
  lat: number;
  lng: number;
}

export type RouteStepKind = 'walk' | 'bus' | 'rail' | 'cycle' | 'drive';

export interface RouteStep {
  kind: RouteStepKind;
  instruction: string;
  /** Bus service number or MRT/LRT line, for transit legs */
  line?: string;
  distanceMeters?: number;
  durationMinutes?: number;
  /** Bus legs: LTA 5-digit code of the boarding stop (for live arrivals) */
  stopCode?: string;
  /** Train legs: boarding station code, e.g. "EW13" (for crowd levels) */
  stationCode?: string;
  /** Train legs: LTA line code, e.g. "EWL" (for disruption alerts and crowd levels) */
  lineCode?: string;
}

export interface RouteResult {
  mode: TravelMode;
  /** 'onemap' = real route from OneMap; 'estimate' = straight-line estimate */
  source: 'onemap' | 'estimate';
  durationMinutes: number;
  distanceKm: number;
  /** Public transport fare as OneMap reports it, e.g. "1.47" (SGD); absent when unknown */
  fareSgd?: string;
  transfers?: number;
  steps: RouteStep[];
  /** Route line for the map, [lat, lng] pairs; empty for estimates */
  path: [number, number][];
  /** Why an estimate was returned instead of a real route */
  note?: string;
}

// ---------- Live transit (LTA DataMall) ----------

export interface BusArrival {
  minutes: number | null;
  load: 'seats' | 'standing' | 'limited' | null;
  wheelchair: boolean;
  doubleDeck: boolean;
  /** false = timetable estimate rather than GPS-tracked */
  live: boolean;
}

export type CrowdLevel = 'low' | 'moderate' | 'high';

export interface TrainAlert {
  line: string;
  lineName: string;
  direction?: string;
  stations: string[];
  freeBus?: string;
  freeShuttle?: string;
  message?: string;
}

export interface LiveTransit {
  /** false when live data isn't configured or every feed failed */
  available: boolean;
  /** Keyed "stopCode:serviceNo" */
  busArrivals: Record<string, BusArrival[]>;
  /** Keyed by station code */
  crowd: Record<string, CrowdLevel>;
  alerts: TrainAlert[];
}
