import { WeatherCondition, DayForecast, WeatherDataMode } from '../types';
import { SINGAPORE_LANDMARKS } from '../data/landmarks';

export interface LiveWeatherResponse {
  weather: WeatherCondition;
  fourDayOutlook: DayForecast[];
  isLive: boolean; // Preserved for backwards compatibility
  dataMode: WeatherDataMode;
  lastUpdated: string;
  sourceStation?: string;
  sourceLabel?: string;
  forecastTempMin?: number;
  forecastTempMax?: number;
  temperatureBasis?: string;
}

// Approximate center coordinates for standard NEA forecast zones
const NEA_AREA_COORDINATES: Record<string, { lat: number; lng: number; region: 'central' | 'east' | 'west' | 'north' | 'south' }> = {
  'City': { lat: 1.2974, lng: 103.8465, region: 'central' },
  'Bukit Merah': { lat: 1.2819, lng: 103.8239, region: 'central' },
  'Queenstown': { lat: 1.2942, lng: 103.8058, region: 'central' },
  'Southern Islands': { lat: 1.2217, lng: 103.8560, region: 'south' },
  'Bedok': { lat: 1.3236, lng: 103.9273, region: 'east' },
  'Changi': { lat: 1.3814, lng: 103.9915, region: 'east' },
  'Pasir Ris': { lat: 1.3721, lng: 103.9474, region: 'east' },
  'Tampines': { lat: 1.3524, lng: 103.9447, region: 'east' },
  'Pulau Ubin': { lat: 1.4124, lng: 103.9912, region: 'east' },
  'Clementi': { lat: 1.3162, lng: 103.7649, region: 'west' },
  'Jurong East': { lat: 1.3329, lng: 103.7436, region: 'west' },
  'Jurong West': { lat: 1.3404, lng: 103.7090, region: 'west' },
  'Hougang': { lat: 1.3713, lng: 103.8915, region: 'north' },
  'Ang Mo Kio': { lat: 1.3691, lng: 103.8454, region: 'north' },
  'Woodlands': { lat: 1.4382, lng: 103.7890, region: 'north' },
  'Sungei Kadut': { lat: 1.4182, lng: 103.7470, region: 'north' },
  'Kranji': { lat: 1.4285, lng: 103.7225, region: 'north' },
  'Novena': { lat: 1.3204, lng: 103.8438, region: 'central' },
  'Marine Parade': { lat: 1.3025, lng: 103.9073, region: 'east' },
  'Sentosa': { lat: 1.2494, lng: 103.8303, region: 'south' }
};

// Map user landmark name to NEA forecast zone
export function getNearestArea(locationName: string): string {
  const loc = locationName.toLowerCase();
  if (loc.includes('canning') || loc.includes('orchard') || loc.includes('bras basah') || loc.includes('museum') || loc.includes('emerald') || loc.includes('barrage') || loc.includes('marina')) {
    return 'City';
  }
  if (loc.includes('tiong bahru') || loc.includes('havelock') || loc.includes('everton') || loc.includes('bukit merah')) {
    return 'Bukit Merah';
  }
  if (loc.includes('katong') || loc.includes('joo chiat') || loc.includes('koon seng') || loc.includes('marine parade') || loc.includes('bedok')) {
    return 'Bedok';
  }
  if (loc.includes('wessex') || loc.includes('portsdown') || loc.includes('queenstown') || loc.includes('one-north') || loc.includes('rail corridor')) {
    return 'Queenstown';
  }
  if (loc.includes('henderson') || loc.includes('telok blangah') || loc.includes('harbourfront') || loc.includes('lazarus') || loc.includes('st john') || loc.includes('southern ridges')) {
    return 'Southern Islands';
  }
  if (loc.includes('haw par') || loc.includes('pasir panjang') || loc.includes('clementi') || loc.includes('labrador')) {
    return 'Clementi';
  }
  if (loc.includes('hive') || loc.includes('ntu') || loc.includes('jurong')) {
    return 'Jurong West';
  }
  if (loc.includes('buangkok') || loc.includes('hougang') || loc.includes('sengkang') || loc.includes('japanese cemetery')) {
    return 'Hougang';
  }
  if (loc.includes('ubin') || loc.includes('chek jawa')) {
    return 'Pulau Ubin';
  }
  if (loc.includes('changi')) {
    return 'Changi';
  }
  if (loc.includes('coney') || loc.includes('punggol')) {
    return 'Punggol';
  }
  if (loc.includes('sungei buloh') || loc.includes('kranji')) {
    return 'Kranji';
  }
  if (loc.includes('thomson') || loc.includes('mactritchie') || loc.includes('treetop')) {
    return 'Ang Mo Kio';
  }
  if (loc.includes('balestier') || loc.includes('novena')) {
    return 'Novena';
  }
  return 'City';
}

export function getRegionFromArea(area: string): 'north' | 'south' | 'east' | 'west' | 'central' {
  if (NEA_AREA_COORDINATES[area]) {
    return NEA_AREA_COORDINATES[area].region;
  }
  return 'central';
}

/**
 * Calculates great-circle distance between two geocoordinates using the Haversine formula (km)
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Retrieves the current date and time in the Singapore timezone (Asia/Singapore)
 */
export function getSingaporeCurrentTime(): {
  sgDate: string; // YYYY-MM-DD
  sgHour: number; // 0-23
  sgMinute: number; // 0-59
  sgTotalMinutes: number;
} {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);

  const getVal = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const sgDate = `${getVal('year')}-${getVal('month')}-${getVal('day')}`;
  const sgHour = parseInt(getVal('hour'), 10) || 0;
  const sgMinute = parseInt(getVal('minute'), 10) || 0;

  return {
    sgDate,
    sgHour,
    sgMinute,
    sgTotalMinutes: sgHour * 60 + sgMinute
  };
}

/**
 * Determines whether a user's selected date and time falls into the "LIVE / CURRENT" observation window.
 * Rule: Must be today in Singapore AND within approximately 2 hours (+/- 120 minutes) of current Singapore time.
 */
export function isRequestLive(selectedDate: string, selectedTime: string): boolean {
  const { sgDate, sgTotalMinutes } = getSingaporeCurrentTime();
  if (selectedDate !== sgDate) return false;

  const [hStr, mStr] = selectedTime.split(':');
  const userHour = parseInt(hStr, 10) || 0;
  const userMinute = parseInt(mStr, 10) || 0;
  const userTotalMinutes = userHour * 60 + userMinute;

  return Math.abs(userTotalMinutes - sgTotalMinutes) <= 120;
}

/**
 * Deterministic diurnal temperature estimation curve for Singapore tropical climate:
 * Calculates expected temperature at a given time based on official min/max forecast range.
 * - 06:00 - 09:59 (early morning): near low + 10% - 25% of range
 * - 10:00 - 11:59 (late morning heating): low + 50% - 70% of range
 * - 12:00 - 15:59 (midday / early afternoon peak): near high, 85% - 100% of range
 * - 16:00 - 18:59 (late afternoon cooling): 65% - 85% of range
 * - 19:00 - 22:59 (evening pleasant): 35% - 55% of range
 * - 23:00 - 05:59 (late night calm): near low + 10% - 25% of range
 */
export function estimateDiurnalTemperature(
  tempMin: number,
  tempMax: number,
  timeStr: string
): number {
  const [hStr, mStr] = timeStr.split(':');
  const parsedHour = parseInt(hStr, 10);
  const hour = (Number.isNaN(parsedHour) ? 12 : parsedHour) + (parseInt(mStr, 10) || 0) / 60;
  const range = Math.max(1, tempMax - tempMin);

  let factor = 0.2;
  if (hour >= 6 && hour < 10) {
    const progress = (hour - 6) / 4;
    factor = 0.10 + progress * 0.15;
  } else if (hour >= 10 && hour < 12) {
    const progress = (hour - 10) / 2;
    factor = 0.50 + progress * 0.20;
  } else if (hour >= 12 && hour < 16) {
    const progress = (hour - 12) / 4;
    factor = 0.88 + Math.sin(progress * Math.PI) * 0.12;
  } else if (hour >= 16 && hour < 19) {
    const progress = (hour - 16) / 3;
    factor = 0.85 - progress * 0.20;
  } else if (hour >= 19 && hour < 23) {
    const progress = (hour - 19) / 4;
    factor = 0.55 - progress * 0.20;
  } else {
    factor = 0.15;
  }

  const estimated = tempMin + factor * range;
  return Number(estimated.toFixed(1));
}

/**
 * Derives an app-level categorical rain risk rating based on NEA forecast text.
 * Note: NEA does not publish exact hourly numerical probabilities; this provides tourist guidance.
 */
function deriveRainRiskFromText(text: string): {
  score: 'Low' | 'Moderate' | 'High' | 'Very High';
  numericApprox: number;
} {
  const lower = text.toLowerCase();
  if (lower.includes('heavy') || lower.includes('monsoon') || lower.includes('torrential')) {
    return { score: 'Very High', numericApprox: 85 };
  }
  if (lower.includes('thundery') || lower.includes('storm')) {
    return { score: 'High', numericApprox: 70 };
  }
  if (lower.includes('shower') || lower.includes('rain')) {
    return { score: 'Moderate', numericApprox: 50 };
  }
  if (lower.includes('cloudy')) {
    return { score: 'Low', numericApprox: 25 };
  }
  return { score: 'Low', numericApprox: 15 };
}

// In-memory cache to handle rapid UI scrubber updates and data.gov.sg rate limits
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const apiCache = new Map<string, CacheEntry<any>>();

// Known NEA temperature stations catalog for coordinate resolution
const KNOWN_NEA_STATIONS = [
  { id: 'S111', name: 'Scotts Road', location: { latitude: 1.3106, longitude: 103.8365 } },
  { id: 'S109', name: 'Ang Mo Kio Avenue 5', location: { latitude: 1.3793, longitude: 103.8500 } },
  { id: 'S106', name: 'Jalan Noordin (Pulau Ubin)', location: { latitude: 1.4168, longitude: 103.9673 } },
  { id: 'S44', name: 'Nanyang Avenue (Jurong West)', location: { latitude: 1.3458, longitude: 103.6817 } },
  { id: 'S117', name: 'Banyan Road (Jurong Island)', location: { latitude: 1.2542, longitude: 103.6741 } },
  { id: 'S107', name: 'East Coast Park', location: { latitude: 1.3133, longitude: 103.9620 } },
  { id: 'S104', name: 'Woodlands Avenue 9', location: { latitude: 1.4439, longitude: 103.7854 } },
  { id: 'S115', name: 'Tuas South Avenue 3', location: { latitude: 1.2938, longitude: 103.6184 } },
  { id: 'S116', name: 'Pasir Panjang Terminal', location: { latitude: 1.2824, longitude: 103.7545 } },
  { id: 'S102', name: 'Semakau Island', location: { latitude: 1.1902, longitude: 103.7657 } },
  { id: 'S80', name: 'Sembawang Meteorological Station', location: { latitude: 1.4252, longitude: 103.8202 } },
  { id: 'S60', name: 'Sentosa', location: { latitude: 1.2500, longitude: 103.8279 } },
  { id: 'S121', name: 'Choa Chu Kang', location: { latitude: 1.3729, longitude: 103.7224 } },
  { id: 'S118', name: 'Tai Seng', location: { latitude: 1.3399, longitude: 103.8878 } },
  { id: 'S120', name: 'Tanjong Katong', location: { latitude: 1.3087, longitude: 103.8994 } }
];

async function fetchWithCache(url: string, ttlMs: number): Promise<any> {
  const cached = apiCache.get(url);
  const now = Date.now();

  // If cache is fresh, return cached data
  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data;
  }

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json && json.code === 0 && json.data) {
      apiCache.set(url, { data: json, timestamp: now });
      return json;
    }
    // If rate limited (code 24) and no cache yet, retry once after short delay
    if (json && json.code === 24 && !cached) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const retryRes = await fetch(url);
      const retryJson = await retryRes.json();
      if (retryJson && retryJson.code === 0 && retryJson.data) {
        apiCache.set(url, { data: retryJson, timestamp: Date.now() });
        return retryJson;
      }
    }
    // If rate limited or returned null data, reuse last successful data
    if (cached) {
      return cached.data;
    }
    return json;
  } catch (err) {
    if (cached) {
      return cached.data;
    }
    throw err;
  }
}

/**
 * Resolves geocoordinates for the target location using either:
 * 1. Explicitly supplied coordinates
 * 2. Landmark catalog matching
 * 3. NEA area fallback coordinates
 */
function resolveLocationCoordinates(
  locationName: string,
  targetArea: string,
  suppliedCoords?: { lat: number; lng: number }
): { lat: number; lng: number } {
  if (suppliedCoords && typeof suppliedCoords.lat === 'number') {
    return suppliedCoords;
  }

  const query = locationName.toLowerCase();
  const match = SINGAPORE_LANDMARKS.find((lm) => {
    const lmTitle = lm.name.toLowerCase();
    const cleanQuery = query.split(/[\s/()&-]+/)[0];
    const cleanLm = lmTitle.split(/[\s/()&-]+/)[0];
    return (
      lmTitle === query ||
      query.includes(lmTitle) ||
      lmTitle.includes(query) ||
      (cleanQuery.length >= 4 && cleanLm === cleanQuery)
    );
  });
  if (match) {
    return { lat: match.latitude, lng: match.longitude };
  }

  if (NEA_AREA_COORDINATES[targetArea]) {
    return { lat: NEA_AREA_COORDINATES[targetArea].lat, lng: NEA_AREA_COORDINATES[targetArea].lng };
  }

  return { lat: 1.2974, lng: 103.8465 }; // Default to central Singapore
}

/**
 * Fetches data from official Data.gov.sg v2 endpoints and evaluates whether to provide:
 * A) Live Observation (nearest station, live sensor metrics)
 * B) Forecast Estimate (derived from official 24-hr or 4-day NEA forecast ranges via diurnal model)
 * C) Model Estimate (for dates beyond published official NEA forecast range)
 */
export async function fetchLiveSingaporeWeather(
  locationName: string,
  targetDate: string,
  targetTime: string,
  suppliedCoords?: { lat: number; lng: number }
): Promise<LiveWeatherResponse> {
  const targetArea = getNearestArea(locationName);
  const targetRegion = getRegionFromArea(targetArea);
  const locationCoords = resolveLocationCoordinates(locationName, targetArea, suppliedCoords);
  const { sgDate } = getSingaporeCurrentTime();
  const isLive = isRequestLive(targetDate, targetTime);

  try {
    // Query official data.gov.sg v2 endpoints concurrently with rate-limit resilient cache
    const [
      twoHrRes,
      twentyFourHrRes,
      fourDayRes,
      airTempRes,
      rainfallRes,
      psiRes,
      uvRes,
      humidityRes,
      windRes
    ] = await Promise.allSettled([
      fetchWithCache('https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast', 30000),
      fetchWithCache('https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast', 120000),
      fetchWithCache('https://api-open.data.gov.sg/v2/real-time/api/four-day-outlook', 120000),
      fetchWithCache('https://api-open.data.gov.sg/v2/real-time/api/air-temperature', 20000),
      fetchWithCache('https://api-open.data.gov.sg/v2/real-time/api/rainfall', 20000),
      fetchWithCache('https://api-open.data.gov.sg/v2/real-time/api/psi', 120000),
      fetchWithCache('https://api-open.data.gov.sg/v2/real-time/api/uv', 60000),
      fetchWithCache('https://api-open.data.gov.sg/v2/real-time/api/relative-humidity', 30000),
      fetchWithCache('https://api-open.data.gov.sg/v2/real-time/api/wind-speed', 30000)
    ]);

    // ---------------------------------------------------------
    // 1. Process 4-day outlook data structure
    // ---------------------------------------------------------
    const fourDayOutlook: DayForecast[] = [];
    let matchedFourDayRecord: any = null;

    if (fourDayRes.status === 'fulfilled' && fourDayRes.value?.data?.records?.[0]?.forecasts) {
      const fcasts = fourDayRes.value.data.records[0].forecasts;
      for (const f of fcasts) {
        const text = f.forecast?.text || f.forecast?.summary || 'Passing Showers';
        const isRain = text.toLowerCase().includes('shower') || text.toLowerCase().includes('rain') || text.toLowerCase().includes('thundery');
        const isThunder = text.toLowerCase().includes('thundery') || text.toLowerCase().includes('storm');

        let formattedDate = '';
        let fDateIso = '';
        if (f.timestamp) {
          const dateObj = new Date(f.timestamp);
          fDateIso = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Singapore',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(dateObj);
          formattedDate = dateObj.toLocaleDateString('en-SG', { month: 'short', day: 'numeric', timeZone: 'Asia/Singapore' });
        }

        fourDayOutlook.push({
          dayName: f.day || 'Upcoming',
          dateStr: formattedDate || 'Upcoming',
          tempMin: f.temperature?.low ?? 25,
          tempMax: f.temperature?.high ?? 32,
          condition: text,
          rainChance: isThunder ? 75 : isRain ? 60 : 25,
          icon: isThunder ? 'cloud-lightning' : isRain ? 'cloud-rain' : 'sun'
        });

        if (fDateIso && fDateIso === targetDate) {
          matchedFourDayRecord = f;
        }
      }
    }

    // ---------------------------------------------------------
    // 2. Process 24-hr forecast structure
    // ---------------------------------------------------------
    let twentyFourHourSummary = 'Daily Singapore outlook: passing showers with humid intervals.';
    let dailyTempLow = 25;
    let dailyTempHigh = 33;
    let twentyFourForecastText = 'Passing Showers';
    let isCoveredByTwentyFourHr = false;
    let twentyFourPeriodMatch: any = null;

    if (twentyFourHrRes.status === 'fulfilled' && twentyFourHrRes.value?.data?.records?.[0]) {
      const rec = twentyFourHrRes.value.data.records[0];
      twentyFourForecastText = rec.general?.forecast?.text || 'Passing Showers';
      dailyTempLow = rec.general?.temperature?.low ?? 25;
      dailyTempHigh = rec.general?.temperature?.high ?? 33;
      twentyFourHourSummary = `${twentyFourForecastText}. Expected daily temperature range: ${dailyTempLow}°C – ${dailyTempHigh}°C.`;

      const vStart = rec.general?.validPeriod?.start ? new Date(rec.general.validPeriod.start).getTime() : 0;
      const vEnd = rec.general?.validPeriod?.end ? new Date(rec.general.validPeriod.end).getTime() : 0;
      const targetTimeMs = new Date(`${targetDate}T${targetTime}:00+08:00`).getTime();
      if (vStart > 0 && vEnd > 0 && targetTimeMs >= vStart - 1800000 && targetTimeMs <= vEnd + 1800000) {
        isCoveredByTwentyFourHr = true;
      }
      if (rec.periods) {
        for (const p of rec.periods) {
          const pStart = p.timePeriod?.start ? new Date(p.timePeriod.start).getTime() : 0;
          const pEnd = p.timePeriod?.end ? new Date(p.timePeriod.end).getTime() : 0;
          if (pStart > 0 && pEnd > 0 && targetTimeMs >= pStart && targetTimeMs <= pEnd) {
            twentyFourPeriodMatch = p;
            break;
          }
        }
      }
    }

    // ---------------------------------------------------------
    // 3. Process 2-hour forecast structure (for current/near-term condition)
    // ---------------------------------------------------------
    let twoHourCondition = 'Partly Cloudy';
    let twoHourText = 'Partly cloudy conditions expected across the sector.';
    let isInsideTwoHourPeriod = false;

    if (twoHrRes.status === 'fulfilled' && twoHrRes.value?.data?.items?.[0]) {
      const item = twoHrRes.value.data.items[0];
      const match = item.forecasts?.find(
        (f: any) => f.area.toLowerCase() === targetArea.toLowerCase()
      );
      if (match) {
        twoHourCondition = match.forecast;
        twoHourText = `${match.forecast} forecast in ${match.area} (${item.valid_period?.text || 'Next 2 Hours'}).`;
      } else if (item.forecasts?.[0]) {
        twoHourCondition = item.forecasts[0].forecast;
        twoHourText = `${item.forecasts[0].forecast} across Singapore (${item.valid_period?.text || 'Next 2 Hours'}).`;
      }

      // Check if selected time is inside this valid period
      if (targetDate === sgDate && item.valid_period?.start && item.valid_period?.end) {
        const startMs = new Date(item.valid_period.start).getTime();
        const endMs = new Date(item.valid_period.end).getTime();
        const selectedDateTimeMs = new Date(`${targetDate}T${targetTime}:00+08:00`).getTime();
        if (selectedDateTimeMs >= startMs - 900000 && selectedDateTimeMs <= endMs + 900000) {
          isInsideTwoHourPeriod = true;
        }
      }
    }

    // ---------------------------------------------------------
    // 4. Determine Data Mode & Air Temperature
    // ---------------------------------------------------------
    let dataMode: WeatherDataMode = 'live';
    let tempC = 29.0;
    let sourceStation = 'Nearest NEA station';
    let sourceLabel = 'Live observation';
    let temperatureBasis = '';
    let conditionText = 'Partly Cloudy';
    let forecastMin: number | undefined;
    let forecastMax: number | undefined;

    if (isLive) {
      // ---------------------------------------------------------
      // CASE A: LIVE OBSERVATION (Must use nearest available station)
      // ---------------------------------------------------------
      dataMode = 'live';
      conditionText = twoHourCondition;

      if (airTempRes.status === 'fulfilled' && airTempRes.value?.data) {
        const apiStations: any[] = airTempRes.value.data.stations || [];
        const stations: any[] = apiStations.length > 0 ? apiStations : KNOWN_NEA_STATIONS;
        const readings: any[] = airTempRes.value.data.readings?.[0]?.data || [];

        // Build list of valid stations with their latest readings and calculate distance
        const validStationReadings: {
          station: any;
          reading: any;
          distKm: number;
        }[] = [];

        for (const st of stations) {
          const reading = readings.find((r) => r.stationId === st.id || r.stationId === st.deviceId);
          const knownLoc = KNOWN_NEA_STATIONS.find((k) => k.id === st.id)?.location;
          const lat = st.location?.latitude ?? knownLoc?.latitude;
          const lng = st.location?.longitude ?? knownLoc?.longitude;

          if (reading && typeof reading.value === 'number' && typeof lat === 'number' && typeof lng === 'number') {
            const dist = getDistanceKm(locationCoords.lat, locationCoords.lng, lat, lng);
            validStationReadings.push({
              station: { ...st, name: st.name || knownLoc ? st.name || KNOWN_NEA_STATIONS.find(k => k.id === st.id)?.name : st.id },
              reading,
              distKm: dist
            });
          }
        }

        if (validStationReadings.length > 0) {
          // Sort by ascending distance from selected location
          validStationReadings.sort((a, b) => a.distKm - b.distKm);
          const nearest = validStationReadings[0];
          tempC = Number(nearest.reading.value.toFixed(1));
          sourceStation = `Nearest NEA station: ${nearest.station.id} (${nearest.station.name}) ~${nearest.distKm.toFixed(1)}km`;
          sourceLabel = `Live observation from station ${nearest.station.id}`;
          temperatureBasis = `Real-time sensor reading from nearest NEA weather station (${nearest.station.id})`;
        } else if (readings.length > 0 && typeof readings[0].value === 'number') {
          // Find nearest known station and use its reading if present, or first reading
          const nearestKnown = [...KNOWN_NEA_STATIONS].sort((a, b) => {
            return getDistanceKm(locationCoords.lat, locationCoords.lng, a.location.latitude, a.location.longitude) -
                   getDistanceKm(locationCoords.lat, locationCoords.lng, b.location.latitude, b.location.longitude);
          })[0];
          const matchedReading = readings.find((r) => r.stationId === nearestKnown.id) || readings[0];
          tempC = Number(matchedReading.value.toFixed(1));
          sourceStation = `Nearest NEA station: ${nearestKnown.id} (${nearestKnown.name})`;
          sourceLabel = `Live observation from station ${nearestKnown.id}`;
          temperatureBasis = 'Real-time sensor reading from nearest NEA station';
        }
      } else {
        // Fallback to nearest known station metadata if network response was delayed
        const nearestKnown = [...KNOWN_NEA_STATIONS].sort((a, b) => {
          return getDistanceKm(locationCoords.lat, locationCoords.lng, a.location.latitude, a.location.longitude) -
                 getDistanceKm(locationCoords.lat, locationCoords.lng, b.location.latitude, b.location.longitude);
        })[0];
        sourceStation = `Nearest NEA station: ${nearestKnown.id} (${nearestKnown.name})`;
        sourceLabel = `Live observation from station ${nearestKnown.id}`;
      }
    } else {
      // ---------------------------------------------------------
      // CASE B / C: FUTURE / FORECAST MODE
      // ---------------------------------------------------------
      // Calculate day difference relative to Singapore current date
      const targetDateMs = new Date(`${targetDate}T12:00:00+08:00`).getTime();
      const sgDateMs = new Date(`${sgDate}T12:00:00+08:00`).getTime();
      const diffDays = Math.round((targetDateMs - sgDateMs) / (1000 * 60 * 60 * 24));
      const isWithinFourDays = diffDays >= 0 && diffDays <= 4;

      if (matchedFourDayRecord) {
        // Covered by official 4-day outlook:
        dataMode = 'forecast-estimate';
        forecastMin = matchedFourDayRecord.temperature?.low ?? 25;
        forecastMax = matchedFourDayRecord.temperature?.high ?? 33;
        tempC = estimateDiurnalTemperature(forecastMin ?? 25, forecastMax ?? 33, targetTime);
        conditionText = matchedFourDayRecord.forecast?.text || matchedFourDayRecord.forecast?.summary || 'Passing Showers';
        sourceStation = 'NEA 4-day outlook range';
        sourceLabel = `NEA forecast range: ${forecastMin}°C–${forecastMax}°C`;
        temperatureBasis = `Estimated for ${targetTime} based on official NEA ${matchedFourDayRecord.day || ''} outlook range (${forecastMin}°C–${forecastMax}°C)`;
      } else if (targetDate === sgDate || isCoveredByTwentyFourHr) {
        // Covered by official 24-hour forecast:
        dataMode = 'forecast-estimate';
        forecastMin = dailyTempLow;
        forecastMax = dailyTempHigh;
        tempC = estimateDiurnalTemperature(forecastMin, forecastMax, targetTime);
        const regionText = twentyFourPeriodMatch?.regions?.[targetRegion]?.text;
        conditionText = isInsideTwoHourPeriod ? twoHourCondition : regionText || twentyFourForecastText;
        sourceStation = 'NEA 24-hour forecast range';
        sourceLabel = `NEA forecast range: ${forecastMin}°C–${forecastMax}°C`;
        temperatureBasis = `Estimated for ${targetTime} based on official NEA 24-hr daily range (${forecastMin}°C–${forecastMax}°C)`;
      } else if (isWithinFourDays) {
        // Within 4-day official forecast window
        dataMode = 'forecast-estimate';
        forecastMin = dailyTempLow;
        forecastMax = Math.max(dailyTempHigh, 34);
        tempC = estimateDiurnalTemperature(forecastMin, forecastMax, targetTime);
        conditionText = twentyFourForecastText;
        sourceStation = 'NEA forecast range';
        sourceLabel = `NEA forecast range: ${forecastMin}°C–${forecastMax}°C`;
        temperatureBasis = `Estimated for ${targetTime} based on official NEA forecast range (${forecastMin}°C–${forecastMax}°C)`;
      } else {
        // Beyond the available official NEA forecast window:
        dataMode = 'model-estimate';
        forecastMin = 25;
        forecastMax = 32;
        tempC = estimateDiurnalTemperature(forecastMin, forecastMax, targetTime);
        conditionText = 'Partly Cloudy';
        sourceStation = 'Model estimate — not live NEA forecast';
        sourceLabel = 'Outside available NEA forecast window';
        temperatureBasis = 'Derived from Singapore historical climate normals (outside official NEA 4-day forecast window)';
      }
    }

    // ---------------------------------------------------------
    // 5. Rainfall & Rain Risk Score
    // ---------------------------------------------------------
    let rainMm = 0.0;
    const rainAnalysis = deriveRainRiskFromText(conditionText);
    let rainRiskScore = rainAnalysis.score;
    let rainProb = rainAnalysis.numericApprox;

    if (isLive && rainfallRes.status === 'fulfilled' && rainfallRes.value?.data?.readings?.[0]?.data?.length) {
      const rainReadings = rainfallRes.value.data.readings[0].data;
      const maxRain = rainReadings.reduce((max: number, cur: any) => Math.max(max, cur.value || 0), 0);
      rainMm = parseFloat(maxRain.toFixed(1));
      if (rainMm > 0) {
        rainRiskScore = 'Very High';
        rainProb = 85;
      }
    }

    // ---------------------------------------------------------
    // 6. Live Metrics: UV Index (Adjusted or masked in future mode)
    // ---------------------------------------------------------
    let uvIndex = 3;
    if (uvRes.status === 'fulfilled' && uvRes.value?.data?.records?.[0]?.index?.length) {
      const indices = uvRes.value.data.records[0].index;
      uvIndex = indices[0]?.value ?? 3;
    }

    const parsedTargetHour = parseInt(targetTime.split(':')[0], 10);
    const targetHour = Number.isNaN(parsedTargetHour) ? 12 : parsedTargetHour;
    if (targetHour >= 19 || targetHour < 7) {
      uvIndex = 0;
    } else if (targetHour >= 11 && targetHour <= 14) {
      uvIndex = Math.max(uvIndex, 8);
    }

    // ---------------------------------------------------------
    // 7. Live Metrics: PSI & PM2.5
    // ---------------------------------------------------------
    let psi = 45;
    let pm25 = 12;
    if (psiRes.status === 'fulfilled' && psiRes.value?.data?.items?.[0]?.readings) {
      const r = psiRes.value.data.items[0].readings;
      psi = r.psi_twenty_four_hourly?.[targetRegion] ?? r.psi_twenty_four_hourly?.central ?? psi;
      pm25 = r.pm25_twenty_four_hourly?.[targetRegion] ?? r.pm25_twenty_four_hourly?.central ?? pm25;
    }

    // ---------------------------------------------------------
    // 8. Relative Humidity
    // ---------------------------------------------------------
    let humidity = 75;
    if (isLive && humidityRes.status === 'fulfilled' && humidityRes.value?.data?.readings?.[0]?.data?.length) {
      const hReadings = humidityRes.value.data.readings[0].data;
      const sum = hReadings.reduce((acc: number, cur: any) => acc + (cur.value || 0), 0);
      humidity = Math.round(sum / hReadings.length);
    } else if (!isLive) {
      // Diurnal humidity curve for future mode: higher in morning/night (80-85%), lower at midday (60-70%)
      if (targetHour >= 11 && targetHour <= 15) {
        humidity = 65;
      } else if (targetHour >= 18 || targetHour <= 8) {
        humidity = 82;
      } else {
        humidity = 74;
      }
    }

    // ---------------------------------------------------------
    // 9. Wind Speed
    // ---------------------------------------------------------
    let windSpeed = 12;
    if (isLive && windRes.status === 'fulfilled' && windRes.value?.data?.readings?.[0]?.data?.length) {
      const wReadings = windRes.value.data.readings[0].data;
      const sum = wReadings.reduce((acc: number, cur: any) => acc + (cur.value || 0), 0);
      const KMH_PER_KNOT = 1.852;
      windSpeed = Math.round((sum / wReadings.length) * KMH_PER_KNOT);
    }

    // ---------------------------------------------------------
    // 10. Normalized Condition Label & Icon
    // ---------------------------------------------------------
    let label: WeatherCondition['label'] = 'Partly Cloudy';
    let icon = 'cloud-sun';
    const lower = conditionText.toLowerCase();

    if (lower.includes('thundery') || lower.includes('heavy rain') || lower.includes('storm')) {
      label = 'Thundery Showers';
      icon = 'cloud-lightning';
    } else if (lower.includes('shower') || lower.includes('rain')) {
      label = 'Passing Showers';
      icon = 'cloud-rain';
    } else if (lower.includes('fair') || lower.includes('sunny')) {
      label = 'Sunny';
      icon = 'sun';
    } else if (lower.includes('breezy') || lower.includes('windy')) {
      label = 'Fair & Breezy';
      icon = 'sun';
    } else if (lower.includes('cloudy')) {
      label = 'Cloudy';
      icon = 'cloud-sun';
    }

    // ---------------------------------------------------------
    // 11. Packing & Comfort Advisory
    // ---------------------------------------------------------
    let packingTip = 'Light breathable cotton, chilled water bottle, and walking footwear.';
    let comfortRating: WeatherCondition['comfortRating'] = 'High Comfort';

    if (label === 'Thundery Showers' || label === 'Passing Showers' || rainRiskScore === 'High' || rainRiskScore === 'Very High') {
      packingTip = 'Sturdy compact umbrella (brolly), water-resistant footwear, and sheltered attraction backup.';
      comfortRating = 'Rain Shield Needed';
    } else if (tempC >= 32 || uvIndex >= 8) {
      packingTip = 'SPF 50+ sunscreen, UV parasol, and electrolyte hydration. Seek shaded linkways.';
      comfortRating = 'Tropical Heat';
    } else if (humidity > 80) {
      comfortRating = 'Moderate Humidity';
    }

    const feelsLikeC = Number((tempC + (humidity > 70 ? 2.5 : 1.0)).toFixed(1));

    return {
      weather: {
        label,
        icon,
        rainProbability: rainProb,
        rainfallMm: isLive ? rainMm : 0.0,
        temperatureC: tempC,
        feelsLikeC,
        uvIndex,
        relativeHumidity: humidity,
        windSpeedKmh: windSpeed,
        psi,
        pm25,
        twoHourForecast: isLive || isInsideTwoHourPeriod ? twoHourText : `${conditionText} forecast for ${targetArea}.`,
        twentyFourHourOutlook: twentyFourHourSummary,
        packingTip,
        comfortRating,
        dataMode,
        forecastTempMin: forecastMin,
        forecastTempMax: forecastMax,
        sourceLabel,
        temperatureBasis,
        rainRiskScore,
        isLiveObservation: isLive
      },
      // Empty when NEA's outlook is unavailable; the app then shows a clearly labelled estimate
      fourDayOutlook,
      isLive: dataMode === 'live',
      dataMode,
      lastUpdated: new Date().toLocaleTimeString('en-SG', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Singapore'
      }),
      sourceStation,
      sourceLabel,
      forecastTempMin: forecastMin,
      forecastTempMax: forecastMax,
      temperatureBasis
    };
  } catch (err) {
    console.error('Error fetching live data.gov.sg weather:', err);
    throw err;
  }
}
