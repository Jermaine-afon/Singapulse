/**
 * Real routes from OneMap's routing service (server-side only — holds the token).
 * Used by the Vercel function api/route.ts and the Vite dev middleware.
 *
 * Falls back to a clearly labelled straight-line estimate whenever OneMap isn't
 * configured, its token has expired, or it can't find a route.
 */
import { ONEMAP_BASE_URL, getOneMapToken, type OneMapEnv } from './oneMapAuth.js';
import { PlannerError } from './planner.js';
import { estimateRoute } from '../src/data/routeEstimate.js';
import { toDisplayCase } from '../src/services/oneMapService.js';
import type { LatLng, RouteResult, RouteStep, TravelMode } from '../src/types/route';

const ROUTE_URL = `${ONEMAP_BASE_URL}/api/public/routingsvc/route`;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_STEPS = 30;
const CACHE_TTL_MS = 10 * 60_000;
const MODES: TravelMode[] = ['walk', 'pt', 'cycle', 'drive'];

// Singapore bounding box (generous) — rejects coordinates that can't be a local trip
const inSingapore = ({ lat, lng }: LatLng) => lat > 1.1 && lat < 1.5 && lng > 103.5 && lng < 104.1;

export interface RouteRequest {
  start: LatLng;
  end: LatLng;
  mode: TravelMode;
  /** Optional for public transport: YYYY-MM-DD and HH:MM (Singapore time); defaults to now */
  date?: string;
  time?: string;
  /** Destination name, used to describe the final walk */
  endName?: string;
}

const parseLatLng = (value: unknown): LatLng | null => {
  if (typeof value !== 'string') return null;
  const [lat, lng] = value.split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

export function parseRouteQuery(query: Record<string, unknown>): RouteRequest {
  const start = parseLatLng(query.start);
  const end = parseLatLng(query.end);
  if (!start || !end || !inSingapore(start) || !inSingapore(end)) {
    throw new PlannerError('Start and end must be places in Singapore.', 400);
  }
  const mode = MODES.includes(query.mode as TravelMode) ? (query.mode as TravelMode) : null;
  if (!mode) throw new PlannerError('Unknown travel mode.', 400);

  const date = typeof query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : undefined;
  const time = typeof query.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(query.time) ? query.time : undefined;
  const endName = typeof query.endName === 'string' ? query.endName.slice(0, 120) : undefined;
  return { start, end, mode, date, time, endName };
}

// ---------- Helpers ----------

/** Decodes a Google-encoded polyline (precision 5) into [lat, lng] pairs. */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

const RAIL_LINES: Record<string, string> = {
  EW: 'East-West Line',
  CG: 'East-West Line (Changi Airport branch)',
  NS: 'North-South Line',
  NE: 'North East Line',
  CC: 'Circle Line',
  CE: 'Circle Line',
  DT: 'Downtown Line',
  TE: 'Thomson-East Coast Line',
  BP: 'Bukit Panjang LRT',
  SE: 'Sengkang LRT',
  SW: 'Sengkang LRT',
  PE: 'Punggol LRT',
  PW: 'Punggol LRT',
};

// OneMap route codes -> LTA DataMall line codes (alerts and crowd data use these)
const LTA_LINE_CODES: Record<string, string> = {
  EW: 'EWL',
  CG: 'CGL',
  NS: 'NSL',
  NE: 'NEL',
  CC: 'CCL',
  CE: 'CEL',
  DT: 'DTL',
  TE: 'TEL',
  BP: 'BPL',
  SE: 'SLRT',
  SW: 'SLRT',
  PE: 'PLRT',
  PW: 'PLRT',
};

/** A transit stop's code from OneMap/OTP: `stopCode`, or the id after "agency:" in `stopId`. */
const stopCodeOf = (stop: any): string | undefined => {
  const raw = stop?.stopCode ?? (typeof stop?.stopId === 'string' ? stop.stopId.split(':').pop() : undefined);
  return typeof raw === 'string' && raw.trim() ? raw.trim().toUpperCase() : undefined;
};

/** Picks the station code on this line from codes like "CE1/DT16" or "EW13". */
const stationCodeFor = (stop: any, routeCode: string): string | undefined => {
  const codes = (stopCodeOf(stop) ?? '').split(/[\/\s,]+/).filter((c) => /^[A-Z]{1,3}\d{1,3}$/.test(c));
  return codes.find((c) => c.startsWith(routeCode)) ?? codes[0];
};

const placeName = (name: unknown, fallback: string) => {
  if (typeof name !== 'string' || !name.trim()) return fallback;
  const lower = name.toLowerCase();
  if (lower === 'origin') return 'your start point';
  if (lower === 'destination') return fallback;
  return toDisplayCase(name);
};

const minutes = (seconds: unknown) => Math.max(1, Math.round((Number(seconds) || 0) / 60));

/** Singapore-time date/time strings in OneMap's pt format (MM-DD-YYYY, HH:MM:SS). */
function oneMapDateTime(date?: string, time?: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Singapore',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  const [y, m, d] = (date ?? `${parts.year}-${parts.month}-${parts.day}`).split('-');
  return { date: `${m}-${d}-${y}`, time: `${time ?? `${parts.hour}:${parts.minute}`}:00` };
}

// ---------- Response normalisation ----------

const TURN_WORDS: Record<string, string> = {
  head: 'Head along',
  straight: 'Continue along',
  left: 'Turn left onto',
  right: 'Turn right onto',
  'slight left': 'Bear left onto',
  'slight right': 'Bear right onto',
  'sharp left': 'Turn sharp left onto',
  'sharp right': 'Turn sharp right onto',
  uturn: 'Make a U-turn onto',
};

/** walk / cycle / drive: { route_summary, route_instructions, route_geometry } */
export function normaliseDirectRoute(data: any, mode: Exclude<TravelMode, 'pt'>, endName: string): RouteResult | null {
  const summary = data?.route_summary;
  if (!summary || !Number.isFinite(Number(summary.total_distance))) return null;

  const kind = mode === 'walk' ? 'walk' : mode === 'cycle' ? 'cycle' : 'drive';
  const steps: RouteStep[] = (Array.isArray(data.route_instructions) ? data.route_instructions : [])
    .filter((row: unknown) => Array.isArray(row))
    .slice(0, MAX_STEPS)
    .map((row: any[]) => {
      const turn = String(row[0] ?? '').trim();
      const road = typeof row[1] === 'string' && row[1].trim() ? toDisplayCase(row[1]) : '';
      const lead = TURN_WORDS[turn.toLowerCase()] ?? (turn ? `${turn} onto` : 'Continue along');
      return {
        kind,
        instruction: road ? `${lead} ${road}` : lead.replace(/ (along|onto)$/, ''),
        distanceMeters: Number.isFinite(Number(row[2])) ? Math.round(Number(row[2])) : undefined,
        durationMinutes: Number.isFinite(Number(row[4])) ? minutes(row[4]) : undefined,
      } satisfies RouteStep;
    });
  steps.push({ kind, instruction: `Arrive at ${endName}` });

  return {
    mode,
    source: 'onemap',
    durationMinutes: minutes(summary.total_time),
    distanceKm: Math.round(Number(summary.total_distance) / 100) / 10,
    steps,
    path: typeof data.route_geometry === 'string' ? decodePolyline(data.route_geometry) : [],
  };
}

/** pt: OpenTripPlanner-style { plan: { itineraries: [{ duration, fare, transfers, legs }] } } */
export function normaliseTransitRoute(data: any, endName: string): RouteResult | null {
  const itinerary = data?.plan?.itineraries?.[0];
  if (!itinerary || !Array.isArray(itinerary.legs) || itinerary.legs.length === 0) return null;

  let distanceMeters = 0;
  const path: [number, number][] = [];
  const steps: RouteStep[] = itinerary.legs.slice(0, MAX_STEPS).map((leg: any) => {
    distanceMeters += Number(leg.distance) || 0;
    if (typeof leg.legGeometry?.points === 'string') path.push(...decodePolyline(leg.legGeometry.points));

    const from = placeName(leg.from?.name, 'your start point');
    const to = placeName(leg.to?.name, endName);
    const mode = String(leg.mode ?? '').toUpperCase();
    const durationMinutes = minutes(leg.duration);
    const distance = Math.round(Number(leg.distance) || 0) || undefined;
    const stops = Number(leg.numIntermediateStops ?? (Array.isArray(leg.intermediateStops) ? leg.intermediateStops.length : NaN));
    const stopText = Number.isFinite(stops) && stops >= 0 ? ` (${stops + 1} stop${stops + 1 === 1 ? '' : 's'})` : '';

    if (mode === 'BUS') {
      const service = String(leg.routeShortName || leg.route || '').trim();
      const boardingStop = stopCodeOf(leg.from);
      return {
        kind: 'bus',
        line: service || undefined,
        stopCode: boardingStop && /^\d{5}$/.test(boardingStop) ? boardingStop : undefined,
        instruction: `Take bus ${service || ''} from ${from} to ${to}${stopText}`.replace(/\s+/g, ' '),
        distanceMeters: distance,
        durationMinutes,
      };
    }
    if (mode === 'SUBWAY' || mode === 'RAIL' || mode === 'TRAM') {
      const code = String(leg.route || leg.routeShortName || '').trim().toUpperCase();
      const lineName = RAIL_LINES[code] ?? (code ? `${code} line` : 'the train');
      return {
        kind: 'rail',
        line: lineName,
        lineCode: LTA_LINE_CODES[code],
        stationCode: stationCodeFor(leg.from, code),
        instruction: `Take the ${lineName} from ${from} to ${to}${stopText}`,
        distanceMeters: distance,
        durationMinutes,
      };
    }
    return { kind: 'walk', instruction: `Walk to ${to}`, distanceMeters: distance, durationMinutes };
  });

  const fare = typeof itinerary.fare === 'string' || typeof itinerary.fare === 'number' ? String(itinerary.fare) : undefined;
  return {
    mode: 'pt',
    source: 'onemap',
    durationMinutes: minutes(itinerary.duration),
    distanceKm: Math.round(distanceMeters / 100) / 10,
    fareSgd: fare && Number.isFinite(Number(fare)) ? Number(fare).toFixed(2) : undefined,
    transfers: Number.isFinite(Number(itinerary.transfers)) ? Number(itinerary.transfers) : undefined,
    steps,
    path,
  };
}

// ---------- OneMap call ----------

// OneMap's docs show a bare token; some clients send "Bearer <token>". Remember what worked.
let authStyle: 'bare' | 'bearer' = 'bare';

async function callOneMap(url: string, token: string): Promise<Response> {
  const attempt = (style: 'bare' | 'bearer') =>
    fetch(url, {
      headers: { Authorization: style === 'bare' ? token : `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  let res = await attempt(authStyle);
  if (res.status === 401) {
    const other = authStyle === 'bare' ? 'bearer' : 'bare';
    const retry = await attempt(other);
    if (retry.status !== 401) authStyle = other;
    res = retry;
  }
  return res;
}

const cache = new Map<string, { at: number; result: RouteResult }>();

export async function getRoute(req: RouteRequest, env: OneMapEnv): Promise<RouteResult> {
  const endName = req.endName?.trim() || 'your destination';
  const estimate = (note: string) => estimateRoute(req.start, req.end, req.mode, note);

  const { date, time } = oneMapDateTime(req.date, req.time);
  const params = new URLSearchParams({
    start: `${req.start.lat},${req.start.lng}`,
    end: `${req.end.lat},${req.end.lng}`,
    routeType: req.mode,
  });
  if (req.mode === 'pt') {
    params.set('date', date);
    params.set('time', time);
    params.set('mode', 'TRANSIT');
    params.set('maxWalkDistance', '1000');
    params.set('numItineraries', '1');
  }
  const url = `${ROUTE_URL}?${params}`;

  // Transit timetables change through the day, so transit results are cached per hour
  const cacheKey = req.mode === 'pt' ? `${req.start.lat},${req.start.lng}|${req.end.lat},${req.end.lng}|pt|${date}|${time.slice(0, 2)}` : url;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result;

  let token = await getOneMapToken(env);
  if (!token) {
    return estimate(
      env.ONEMAP_TOKEN
        ? 'Live routing is paused because the OneMap token has expired.'
        : "Live routing isn't set up yet."
    );
  }

  try {
    let res = await callOneMap(url, token);
    if (res.status === 401 && env.ONEMAP_EMAIL && env.ONEMAP_PASSWORD) {
      token = await getOneMapToken(env, { forceRefresh: true });
      if (token) res = await callOneMap(url, token);
    }
    if (res.status === 401) {
      console.error('OneMap rejected the routing token (401)');
      return estimate('Live routing is paused because OneMap rejected the access token.');
    }
    if (!res.ok) {
      console.error(`OneMap routing error ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
      return estimate("OneMap couldn't be reached just now.");
    }

    const data = await res.json();
    const result = req.mode === 'pt' ? normaliseTransitRoute(data, endName) : normaliseDirectRoute(data, req.mode, endName);
    if (!result) {
      console.error('OneMap returned no usable route:', JSON.stringify(data).slice(0, 300));
      return estimate("OneMap couldn't find a route for this trip.");
    }
    cache.set(cacheKey, { at: Date.now(), result });
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    return result;
  } catch (err: any) {
    console.error('OneMap routing failed:', err?.name, err?.message);
    return estimate("OneMap couldn't be reached just now.");
  }
}
