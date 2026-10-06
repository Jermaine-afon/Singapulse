/**
 * Live public-transport data from LTA DataMall (server-side only — holds the AccountKey).
 * https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html
 *
 * - Bus arrivals (v3): next buses at a stop for a service
 * - Train service alerts: MRT/LRT disruptions
 * - Platform crowd density (real time): crowd level per station
 */
import type { BusArrival, CrowdLevel, LiveTransit, TrainAlert } from '../src/types/route';

export const LTA_BASE_URL = 'https://datamall2.mytransport.sg/ltaodataservice';
const REQUEST_TIMEOUT_MS = 6_000;

/** LTA line codes used by alerts and crowd data, with visitor-facing names */
export const LTA_LINE_NAMES: Record<string, string> = {
  EWL: 'East-West Line',
  CGL: 'East-West Line (Changi Airport branch)',
  NSL: 'North-South Line',
  NEL: 'North East Line',
  CCL: 'Circle Line',
  CEL: 'Circle Line extension',
  DTL: 'Downtown Line',
  TEL: 'Thomson-East Coast Line',
  BPL: 'Bukit Panjang LRT',
  SLRT: 'Sengkang LRT',
  PLRT: 'Punggol LRT',
};

export class LtaError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function fetchLta(path: string, key: string): Promise<any> {
  const res = await fetch(`${LTA_BASE_URL}${path}`, {
    headers: { AccountKey: key, accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new LtaError(`DataMall ${path.split('?')[0]} returned ${res.status}`, res.status);
  return res.json();
}

// Small TTL cache so many visitors looking at the same stop share one DataMall call
const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 1000) cache.delete(cache.keys().next().value!);
  return value;
}

export function resetLtaCache() {
  cache.clear();
}

// ---------- Bus arrivals ----------

const LOADS: Record<string, BusArrival['load']> = { SEA: 'seats', SDA: 'standing', LSD: 'limited' };

/** Normalises one Services[] entry into up to three upcoming buses. */
export function normaliseBusService(service: any, now = Date.now()): BusArrival[] {
  return [service?.NextBus, service?.NextBus2, service?.NextBus3]
    .filter((bus) => bus && typeof bus.EstimatedArrival === 'string' && bus.EstimatedArrival)
    .map((bus) => {
      const eta = Date.parse(bus.EstimatedArrival);
      return {
        minutes: Number.isFinite(eta) ? Math.max(0, Math.round((eta - now) / 60_000)) : null,
        load: LOADS[bus.Load] ?? null,
        wheelchair: bus.Feature === 'WAB',
        doubleDeck: bus.Type === 'DD',
        // Monitored 0 = schedule-based estimate, not GPS-tracked
        live: Number(bus.Monitored) === 1,
      };
    })
    .filter((bus) => bus.minutes !== null);
}

export async function getBusArrivals(stopCode: string, serviceNo: string, key: string): Promise<BusArrival[]> {
  const data = await cached(`bus:${stopCode}`, 30_000, () => fetchLta(`/v3/BusArrival?BusStopCode=${stopCode}`, key));
  const services: any[] = Array.isArray(data?.Services) ? data.Services : [];
  const service = services.find((s) => String(s?.ServiceNo).toUpperCase() === serviceNo.toUpperCase());
  return service ? normaliseBusService(service) : [];
}

// ---------- Train service alerts ----------

export function normaliseTrainAlerts(data: any): TrainAlert[] {
  const value = data?.value ?? data;
  if (Number(value?.Status) !== 2) return [];
  const messages: string[] = (Array.isArray(value?.Message) ? value.Message : [])
    .map((m: any) => (typeof m?.Content === 'string' ? m.Content.trim() : ''))
    .filter(Boolean);
  return (Array.isArray(value?.AffectedSegments) ? value.AffectedSegments : [])
    .filter((seg: any) => typeof seg?.Line === 'string')
    .map((seg: any) => {
      const line = seg.Line.trim().toUpperCase();
      return {
        line,
        lineName: LTA_LINE_NAMES[line] ?? line,
        direction: typeof seg.Direction === 'string' ? seg.Direction.trim() : undefined,
        stations: typeof seg.Stations === 'string' ? seg.Stations.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        freeBus: typeof seg.FreePublicBus === 'string' && seg.FreePublicBus.trim() ? seg.FreePublicBus.trim() : undefined,
        freeShuttle: typeof seg.FreeMRTShuttle === 'string' && seg.FreeMRTShuttle.trim() ? seg.FreeMRTShuttle.trim() : undefined,
        message: messages.find((m) => m.toUpperCase().includes(line)) ?? messages[0],
      };
    });
}

export async function getTrainAlerts(key: string): Promise<TrainAlert[]> {
  const data = await cached('alerts', 60_000, () => fetchLta('/TrainServiceAlerts', key));
  return normaliseTrainAlerts(data);
}

// ---------- Platform crowd density ----------

const CROWD: Record<string, CrowdLevel> = { l: 'low', m: 'moderate', h: 'high' };

export function normaliseCrowd(data: any): Record<string, CrowdLevel> {
  const rows: any[] = Array.isArray(data?.value) ? data.value : [];
  const levels: Record<string, CrowdLevel> = {};
  for (const row of rows) {
    const level = CROWD[String(row?.CrowdLevel ?? '').toLowerCase()];
    if (typeof row?.Station === 'string' && level) levels[row.Station.trim().toUpperCase()] = level;
  }
  return levels;
}

export async function getCrowdLevels(lineCode: string, key: string): Promise<Record<string, CrowdLevel>> {
  const data = await cached(`crowd:${lineCode}`, 120_000, () => fetchLta(`/PCDRealTime?TrainLine=${lineCode}`, key));
  return normaliseCrowd(data);
}

// ---------- Combined live lookup for one route ----------

export interface LiveRequest {
  buses: { stopCode: string; serviceNo: string }[];
  stations: { stationCode: string; lineCode: string }[];
  lines: string[];
}

const BUS_STOP = /^\d{5}$/;
const SERVICE = /^[0-9A-Z]{1,5}$/;
const STATION = /^[A-Z]{1,3}\d{1,3}$/;

export function parseLiveQuery(query: Record<string, unknown>): LiveRequest {
  const list = (value: unknown, max: number) =>
    typeof value === 'string' && value ? value.split(',').slice(0, max).map((s) => s.trim().toUpperCase()) : [];

  const buses = list(query.buses, 6)
    .map((pair) => {
      const [stopCode, serviceNo] = pair.split(':');
      return { stopCode, serviceNo };
    })
    .filter((b) => BUS_STOP.test(b.stopCode ?? '') && SERVICE.test(b.serviceNo ?? ''));

  const stations = list(query.stations, 8)
    .map((pair) => {
      const [stationCode, lineCode] = pair.split(':');
      return { stationCode, lineCode };
    })
    .filter((s) => STATION.test(s.stationCode ?? '') && (s.lineCode ?? '') in LTA_LINE_NAMES);

  const lines = list(query.lines, 6).filter((line) => line in LTA_LINE_NAMES);
  return { buses, stations, lines };
}

/**
 * Everything live for one route. Each feed fails independently: a DataMall hiccup on
 * one part never blanks the others, and nothing here can break the route itself.
 */
export async function getLiveTransit(req: LiveRequest, key: string | undefined): Promise<LiveTransit> {
  if (!key) return { available: false, busArrivals: {}, crowd: {}, alerts: [] };

  const busArrivals: LiveTransit['busArrivals'] = {};
  const crowd: LiveTransit['crowd'] = {};
  let alerts: TrainAlert[] = [];
  let anyFeedWorked = false;

  const tasks: Promise<void>[] = [
    ...req.buses.map(async ({ stopCode, serviceNo }) => {
      try {
        busArrivals[`${stopCode}:${serviceNo}`] = await getBusArrivals(stopCode, serviceNo, key);
        anyFeedWorked = true;
      } catch (err: any) {
        console.error('LTA bus arrival failed:', err?.message);
      }
    }),
    ...[...new Set(req.stations.map((s) => s.lineCode))].map(async (lineCode) => {
      try {
        const levels = await getCrowdLevels(lineCode, key);
        for (const { stationCode, lineCode: line } of req.stations) {
          if (line === lineCode && levels[stationCode]) crowd[stationCode] = levels[stationCode];
        }
        anyFeedWorked = true;
      } catch (err: any) {
        console.error('LTA crowd density failed:', err?.message);
      }
    }),
  ];
  if (req.lines.length) {
    tasks.push(
      (async () => {
        try {
          alerts = (await getTrainAlerts(key)).filter((a) => req.lines.includes(a.line));
          anyFeedWorked = true;
        } catch (err: any) {
          console.error('LTA train alerts failed:', err?.message);
        }
      })()
    );
  }
  await Promise.all(tasks);

  const requestedSomething = req.buses.length + req.stations.length + req.lines.length > 0;
  return { available: anyFeedWorked || !requestedSomething, busArrivals, crowd, alerts };
}

// ---------- Health ----------

export interface LtaHealth {
  name: string;
  status: 'connected' | 'not_configured' | 'invalid_key' | 'error';
  httpStatus: number | null;
}

export async function checkLta(key: string | undefined): Promise<LtaHealth> {
  const base = { name: 'LTA DataMall (live buses & trains)', httpStatus: null as number | null };
  if (!key) return { ...base, status: 'not_configured' };
  try {
    await fetchLta('/TrainServiceAlerts', key);
    return { ...base, status: 'connected', httpStatus: 200 };
  } catch (err: any) {
    const status = err instanceof LtaError ? err.status : null;
    return { ...base, status: status === 401 || status === 403 ? 'invalid_key' : 'error', httpStatus: status };
  }
}
