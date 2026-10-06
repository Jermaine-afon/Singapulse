import type { LatLng, RouteResult, TravelMode } from '../types/route';

// Rough Singapore averages: road/footpath detour over straight line, door-to-door speed, fixed overhead
const PROFILES: Record<TravelMode, { detour: number; kmh: number; overheadMin: number }> = {
  walk: { detour: 1.3, kmh: 4.8, overheadMin: 0 },
  cycle: { detour: 1.3, kmh: 14, overheadMin: 0 },
  drive: { detour: 1.4, kmh: 30, overheadMin: 5 }, // includes pick-up and parking time
  pt: { detour: 1.35, kmh: 22, overheadMin: 10 }, // includes walking to stations and waiting
};

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Honest fallback when real routing isn't available: distance from coordinates,
 * time from typical speeds. No steps, because we don't know the actual path.
 */
export function estimateRoute(start: LatLng, end: LatLng, mode: TravelMode, note: string): RouteResult {
  const profile = PROFILES[mode];
  const distanceKm = haversineKm(start, end) * profile.detour;
  const durationMinutes = Math.max(1, Math.round((distanceKm / profile.kmh) * 60 + profile.overheadMin));
  return {
    mode,
    source: 'estimate',
    durationMinutes,
    distanceKm: Math.round(distanceKm * 10) / 10,
    steps: [],
    path: [],
    note,
  };
}
