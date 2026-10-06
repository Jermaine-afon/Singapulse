/**
 * OneMap Singapore search (public, no token needed):
 * https://www.onemap.gov.sg/api/common/elastic/search
 *
 * Routing needs a token and runs server-side (server/routing.ts → /api/route).
 */

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
 */
export async function searchOneMap(query: string): Promise<OneMapSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
    query
  )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

  try {
    const res = await fetch(url);
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
