/**
 * NEA 2-hour weather forecast by area (Data.gov.sg, no key):
 * https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast
 */
const FORECAST_URL = 'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast';
const CACHE_MS = 10 * 60_000;

export type ForecastKind = 'thunder' | 'rain' | 'cloudy' | 'haze' | 'fair-day' | 'fair-night';

export interface AreaForecast {
  area: string;
  lat: number;
  lng: number;
  forecast: string;
  kind: ForecastKind;
}

export interface RainForecast {
  /** e.g. "12.30 pm to 2.30 pm" */
  validText: string;
  areas: AreaForecast[];
}

/** Groups NEA's forecast phrases ("Heavy Thundery Showers with Gusty Winds", "Partly Cloudy (Night)", …). */
export function classifyForecast(forecast: string): ForecastKind {
  const f = forecast.toLowerCase();
  if (f.includes('thunder')) return 'thunder';
  if (/rain|shower|drizzle/.test(f)) return 'rain';
  if (/haz|mist|fog/.test(f)) return 'haze';
  if (/cloud|overcast|windy/.test(f)) return 'cloudy';
  return f.includes('night') ? 'fair-night' : 'fair-day';
}

export const isWet = (kind: ForecastKind) => kind === 'rain' || kind === 'thunder';

export function parseRainForecast(json: any): RainForecast | null {
  const data = json?.data;
  const item = data?.items?.[0];
  if (!Array.isArray(data?.area_metadata) || !Array.isArray(item?.forecasts)) return null;

  const forecastByArea = new Map<string, string>(
    item.forecasts.filter((f: any) => typeof f?.area === 'string').map((f: any) => [f.area, String(f.forecast ?? '')])
  );
  const areas: AreaForecast[] = data.area_metadata
    .map((meta: any) => {
      const forecast = forecastByArea.get(meta?.name);
      const lat = Number(meta?.label_location?.latitude);
      const lng = Number(meta?.label_location?.longitude);
      if (!forecast || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { area: meta.name, lat, lng, forecast, kind: classifyForecast(forecast) };
    })
    .filter((a: AreaForecast | null): a is AreaForecast => a !== null);

  if (areas.length === 0) return null;
  return { validText: String(item.valid_period?.text ?? ''), areas };
}

let cached: { at: number; value: RainForecast } | null = null;

/** Throws when the forecast can't be loaded, so the map can say so. */
export async function fetchRainForecast(): Promise<RainForecast> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const res = await fetch(FORECAST_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`NEA forecast returned ${res.status}`);
  const value = parseRainForecast(await res.json());
  if (!value) throw new Error('NEA forecast was empty');
  cached = { at: Date.now(), value };
  return value;
}
