/**
 * One-off: find a freely licensed photo for each landmark on Wikimedia Commons and
 * write src/data/landmarkImages.ts (URL + author + licence for attribution).
 *
 *   npx tsx scripts/fetch-landmark-images.ts
 *
 * A photo is only used when the Wikipedia article it comes from is within MAX_DISTANCE_KM
 * of the landmark (or, for articles without coordinates, the names clearly match), and the
 * file is hosted on Commons under a free licence (Wikipedia's local "fair use" files are skipped).
 */
import { writeFileSync } from 'node:fs';
import { CURATED_HIDDEN_GEMS } from '../src/data/landmarks';
import { STB_TOURIST_ATTRACTIONS } from '../src/data/stbAttractions';
import type { Landmark } from '../src/types';

const USER_AGENT = 'SingapulseImageFetcher/1.0 (https://github.com/Jermaine-afon/Singapulse)';
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const MAX_DISTANCE_KM = 3;
const THUMB_WIDTH = 960;

// Files that are never a photo of the place
const NOT_A_PHOTO = /logo|map|locator|location|flag|seal|emblem|icon|coat_of_arms|diagram|plan\b|\.svg$/i;
const FREE_LICENCE = /^(cc0|cc[- ]by|public domain|pd\b|attribution)/i;

interface LandmarkImage {
  url: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl?: string;
  article: string;
}

// Articles that pass the automatic checks but are about something else
const REJECT_ARTICLES = new Set([
  'Sun Yat-sen University', // a university in China, not the Singapore memorial hall
  'Lim Bo Seng', // biography (portrait), not the memorial
  'NTU Centre for Contemporary Art Singapore', // a different arts centre from The Substation
  'Supreme Court of Singapore', // shows the new building; the Old Supreme Court is now the National Gallery
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(base: string, params: Record<string, string>) {
  const url = `${base}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) return res.json();
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`Request failed: ${url}`);
}

/** "Marina Bay Sands®: Attractions & Things to Do" -> "Marina Bay Sands" */
function cleanName(name: string): string {
  return name
    .replace(/<[^>]+>/g, '')
    .replace(/[®™]|â„¢/g, '')
    .split(/[:–|]/)[0]
    .replace(/\b(in|of|the)\s*$/i, '')
    .replace(/&\s*(Singapore\s*)?(Museum|Places of Interest|Singapore Park|Singapore Islands)\s*$/i, '')
    .replace(/\s*-\s*a Singapore.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(' ')
      .filter((t) => t.length > 2 && !['singapore', 'the', 'and'].includes(t))
  );

function nameOverlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / ta.size;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Commons file info if the file lives on Commons under a free licence, else null. */
async function freeCommonsImage(fileName: string): Promise<Omit<LandmarkImage, 'article'> | null> {
  const data = await api(COMMONS_API, {
    action: 'query',
    titles: `File:${fileName}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: String(THUMB_WIDTH),
    iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl',
  });
  const page = data?.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!page || page.missing || !info?.thumburl) return null;
  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value ?? '');
  if (!FREE_LICENCE.test(license)) return null;
  return {
    url: info.thumburl,
    sourceUrl: info.descriptionurl,
    author: stripHtml(meta.Artist?.value ?? '') || 'Unknown author',
    license,
    licenseUrl: meta.LicenseUrl?.value || undefined,
  };
}

/** Names to try, most specific first: "Haji Lane Street Art & Indie Shophouses" -> also "Haji Lane Street Art", "Haji Lane" */
function nameVariants(raw: string): string[] {
  const full = cleanName(raw);
  const beforeAmp = full.split(/\s*[&/]\s*/)[0].trim();
  const descriptors =
    /\s+(street art|indie shophouses|shophouses|courtyard|floral arches|ruins|rustic enclave|boardwalks?|coastal boardwalk|casuarina trails|trail|alleys|streamline moderne|spiral green roof|tree tunnel|spiral staircase|pastel|heritage|artisan|landmark|memorial landmark).*$/i;
  const core = beforeAmp.replace(descriptors, '').trim();
  return [...new Set([full, beforeAmp, core].filter((n) => tokens(n).size > 0))];
}

async function findImage(lm: Landmark): Promise<LandmarkImage | null> {
  for (const name of nameVariants(lm.name)) {
    const image = await findImageFor(lm, name);
    if (image) return image;
    await sleep(150);
  }
  return findNearbyCommonsPhoto(lm);
}

/**
 * Second pass: a Commons photo taken within GEO_RADIUS_M of the landmark whose file name
 * also names it (e.g. "Haji_Lane,_Singapore.jpg"), so a random nearby photo is never used.
 */
const GEO_RADIUS_M = 150;
async function findNearbyCommonsPhoto(lm: Landmark): Promise<LandmarkImage | null> {
  const data = await api(COMMONS_API, {
    action: 'query',
    list: 'geosearch',
    gscoord: `${lm.latitude}|${lm.longitude}`,
    gsradius: String(GEO_RADIUS_M),
    gsnamespace: '6',
    gslimit: '30',
  });
  const names = nameVariants(lm.name);
  const files: string[] = (data?.query?.geosearch ?? [])
    .map((g: any) => String(g.title).replace(/^File:/, ''))
    .filter((f: string) => /\.(jpe?g)$/i.test(f) && !NOT_A_PHOTO.test(f))
    .filter((f: string) => names.some((n) => nameOverlap(n, f.replace(/[_.]/g, ' ')) >= 0.6));
  // Prefer general views of the place over close-ups of exhibits, interiors and details
  const closeUp = /interior|detail|display|model|show|exhibit|sign|plaque|cupola|bike|crocodile|shops?|statue of a/i;
  files.sort((a, b) => Number(closeUp.test(a)) - Number(closeUp.test(b)));
  for (const file of files.slice(0, 5)) {
    const image = await freeCommonsImage(file);
    if (image) return { ...image, article: `Commons: ${file}` };
  }
  return null;
}

async function findImageFor(lm: Landmark, name: string): Promise<LandmarkImage | null> {
  const data = await api(WIKI_API, {
    action: 'query',
    generator: 'search',
    gsrsearch: `${name} Singapore`,
    gsrlimit: '5',
    prop: 'pageimages|coordinates',
    piprop: 'name',
    colimit: 'max',
  });
  const pages: any[] = (data?.query?.pages ?? []).sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));

  for (const page of pages) {
    const file: string | undefined = page.pageimage;
    if (!file || NOT_A_PHOTO.test(file) || REJECT_ARTICLES.has(page.title)) continue;

    const coord = page.coordinates?.[0];
    const sameName = nameOverlap(name, page.title) >= 0.6 && nameOverlap(page.title, name) >= 0.5;
    // Location must agree when the article has coordinates; without them, demand a Singapore
    // article or a near-exact name so same-named places abroad can't slip through
    const placed = coord
      ? distanceKm(lm.latitude, lm.longitude, coord.lat, coord.lon) <= MAX_DISTANCE_KM
      : /singapore/i.test(page.title) || nameOverlap(name, page.title) >= 0.9;
    if (!sameName || !placed) continue;

    const image = await freeCommonsImage(file);
    if (image) return { ...image, article: page.title };
  }
  return null;
}

async function main() {
  const landmarks: Landmark[] = [...CURATED_HIDDEN_GEMS, ...STB_TOURIST_ATTRACTIONS];
  const found: Record<string, LandmarkImage> = {};
  const missing: string[] = [];

  for (const [i, lm] of landmarks.entries()) {
    try {
      const image = await findImage(lm);
      if (image) found[lm.id] = image;
      else missing.push(lm.name);
      console.log(`${String(i + 1).padStart(3)}/${landmarks.length} ${image ? 'OK  ' : 'NONE'} ${lm.name}${image ? `  <- ${image.article}` : ''}`);
    } catch (err: any) {
      missing.push(lm.name);
      console.log(`${String(i + 1).padStart(3)}/${landmarks.length} ERR  ${lm.name}: ${err?.message}`);
    }
    await sleep(250); // be polite to the Wikimedia APIs
  }

  const header = `// Generated by scripts/fetch-landmark-images.ts — do not edit by hand.
// Freely licensed photos from Wikimedia Commons; each must be shown with its author and licence.

export interface LandmarkImage {
  url: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl?: string;
  article: string;
}

export const LANDMARK_IMAGES: Record<string, LandmarkImage> = `;
  writeFileSync('src/data/landmarkImages.ts', `${header}${JSON.stringify(found, null, 2)};\n`);
  console.log(`\nFound ${Object.keys(found).length}/${landmarks.length}. Missing:\n- ${missing.join('\n- ')}`);
}

main();
