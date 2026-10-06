import type { LiveTransit, RouteResult } from '../types/route';

const CLIENT_TIMEOUT_MS = 10_000;

/** What a route needs from LTA: boarding stops, boarding stations, and lines used. Null if nothing. */
export function liveQueryFor(route: RouteResult): string | null {
  if (route.source !== 'onemap' || route.mode !== 'pt') return null;
  const buses = route.steps.filter((s) => s.kind === 'bus' && s.stopCode && s.line).map((s) => `${s.stopCode}:${s.line}`);
  const stations = route.steps
    .filter((s) => s.kind === 'rail' && s.stationCode && s.lineCode)
    .map((s) => `${s.stationCode}:${s.lineCode}`);
  const lines = [...new Set(route.steps.filter((s) => s.kind === 'rail' && s.lineCode).map((s) => s.lineCode!))];
  if (!buses.length && !stations.length && !lines.length) return null;

  const params = new URLSearchParams();
  if (buses.length) params.set('buses', buses.join(','));
  if (stations.length) params.set('stations', stations.join(','));
  if (lines.length) params.set('lines', lines.join(','));
  return params.toString();
}

/** Live arrivals/crowds/alerts for a route. Never throws: failures just mean no live extras. */
export async function fetchLiveTransit(query: string): Promise<LiveTransit | null> {
  try {
    const res = await fetch(`/api/live?${query}`, { signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS) });
    if (!res.ok) return null;
    const data = (await res.json()) as LiveTransit;
    return data?.available ? data : null;
  } catch {
    return null;
  }
}
