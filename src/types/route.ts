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
