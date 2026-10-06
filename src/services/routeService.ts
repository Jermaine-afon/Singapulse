import type { LatLng, RouteResult, TravelMode } from '../types/route';
import { estimateRoute } from '../data/routeEstimate';

const CLIENT_TIMEOUT_MS = 20_000;
const cache = new Map<string, RouteResult>();

/**
 * Gets a route from the server (/api/route → OneMap). If the server can't be reached,
 * falls back to a labelled straight-line estimate so the dialog always has something honest to show.
 */
export async function fetchRoute(start: LatLng, end: LatLng, mode: TravelMode, endName: string): Promise<RouteResult> {
  const params = new URLSearchParams({
    start: `${start.lat},${start.lng}`,
    end: `${end.lat},${end.lng}`,
    mode,
    endName,
  });
  const key = params.toString();
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/route?${key}`, { signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS) });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || typeof data.durationMinutes !== 'number') {
      return estimateRoute(start, end, mode, data?.error || "Route service isn't available right now.");
    }
    const route = data as RouteResult;
    // Only cache real routes; estimates should be retried next time
    if (route.source === 'onemap') cache.set(key, route);
    return route;
  } catch {
    return estimateRoute(start, end, mode, "Route service couldn't be reached.");
  }
}
