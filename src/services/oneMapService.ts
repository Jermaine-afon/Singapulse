/**
 * Service for OneMap Singapore APIs:
 * - Search: https://www.onemap.gov.sg/api/common/elastic/search
 * - Mint Token: https://www.onemap.gov.sg/api/auth/post/getToken (requires OneMap account email/password, lasts 3 days)
 * - Routing: https://www.onemap.gov.sg/api/public/routingsvc/route (requires token)
 * - Revgeocode: https://www.onemap.gov.sg/api/public/revgeocode (requires token)
 */

const ONEMAP_TOKEN_KEY = 'kaki_trails_onemap_token';

export interface OneMapSearchResult {
  SEARCHVAL: string;
  BLK_NO: string;
  ROAD_NAME: string;
  BUILDING: string;
  ADDRESS: string;
  POSTAL: string;
  LATITUDE: string;
  LONGITUDE: string;
}

export function getStoredOneMapToken(): string | null {
  try {
    const local = localStorage.getItem(ONEMAP_TOKEN_KEY);
    if (local) return local;
    const envToken = (import.meta as any).env?.VITE_ONEMAP_TOKEN;
    if (envToken) return envToken;
    return null;
  } catch {
    return null;
  }
}

export function setStoredOneMapToken(token: string) {
  try {
    localStorage.setItem(ONEMAP_TOKEN_KEY, token);
  } catch {}
}

export function removeStoredOneMapToken() {
  try {
    localStorage.removeItem(ONEMAP_TOKEN_KEY);
  } catch {}
}

// Short tokens that read better in capitals (OneMap returns names in ALL CAPS)
const KEEP_UPPERCASE = new Set(['MRT', 'LRT', 'HDB', 'NTU', 'NUS', 'SMU', 'SUTD', 'CBD', 'YMCA', 'YWCA', 'SAFRA', 'NEA', 'UOB', 'OCBC', 'DBS']);

/** "TANJONG PAGAR MRT STATION (EW15)" -> "Tanjong Pagar MRT Station (EW15)" */
export function toDisplayCase(text: string): string {
  return text.toLowerCase().replace(/[a-z0-9][a-z0-9']*/g, (word) => {
    const upper = word.toUpperCase();
    // Keep acronyms and station/unit codes like EW15, #01-23 parts, 2A
    if (KEEP_UPPERCASE.has(upper) || (/\d/.test(word) && /[a-z]/.test(word))) return upper;
    return word[0].toUpperCase() + word.slice(1);
  });
}

// OneMap uses the string "NIL" for missing fields
export function getOneMapResultName(res: OneMapSearchResult): string {
  return res.BUILDING && res.BUILDING !== 'NIL' ? res.BUILDING : res.SEARCHVAL;
}

/**
 * Searches OneMap Elastic Search API.
 * Even without token, it returns real search results from Singapore's official master map!
 */
export async function searchOneMap(query: string): Promise<OneMapSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const token = getStoredOneMapToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
    query
  )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`OneMap search failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.warn('OneMap search warning:', err);
    return [];
  }
}

/**
 * Mints a 3-day token using OneMap email and password credentials.
 */
export async function mintOneMapToken(email: string, password: string): Promise<string> {
  const res = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    throw new Error('Failed to mint OneMap token. Please check your credentials.');
  }

  const data = await res.json();
  if (data.access_token) {
    setStoredOneMapToken(data.access_token);
    return data.access_token;
  }
  throw new Error(data.error || 'No access token returned by OneMap.');
}

/**
 * Fetches routing from OneMap if token is available.
 */
export async function fetchOneMapRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  routeType: 'walk' | 'drive' | 'cycle' | 'pt' = 'walk'
) {
  const token = getStoredOneMapToken();
  if (!token) return null;

  const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${startLat},${startLng}&end=${endLat},${endLng}&routeType=${routeType}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
