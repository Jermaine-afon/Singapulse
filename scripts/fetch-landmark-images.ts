/**
 * One-off: pick the best freely licensed photo for each landmark from Wikimedia Commons and
 * write src/data/landmarkImages.ts (URL + author + licence for attribution).
 *
 *   npx tsx scripts/fetch-landmark-images.ts
 *
 * Candidates come from (1) Commons' community-reviewed Featured / Quality / Valued images,
 * (2) the landmark's Wikipedia article lead image, and (3) a general Commons search.
 * Each candidate must name the place (or be its article's image), lie within MAX_DISTANCE_KM when
 * the file has coordinates, and carry a free licence. Candidates are scored to prefer reviewed,
 * landscape, high-resolution exterior shots; places with no good candidate get no photo.
 */
import { writeFileSync } from 'node:fs';
import { CURATED_HIDDEN_GEMS } from '../src/data/landmarks';
import { STB_TOURIST_ATTRACTIONS } from '../src/data/stbAttractions';
import type { Landmark } from '../src/types';

const USER_AGENT = 'SingapulseImageFetcher/2.0 (https://github.com/Jermaine-afon/Singapulse)';
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const MAX_DISTANCE_KM = 3;
const THUMB_WIDTH = 960;
const MIN_SCORE = 1.5;

const QUALITY_CATEGORIES: Record<string, number> = {
  'Category:Featured pictures on Wikimedia Commons': 6,
  'Category:Quality images': 4,
  'Category:Valued images': 3,
};

// Files that are never a photo of the place
const NOT_A_PHOTO = /logo|map|locator|location|flag|seal|emblem|icon|coat_of_arms|diagram|plan\b|\.svg$|\.png$|\.gif$|\.tiff?$/i;
// Close-ups, interiors and people shots make weak card images
const WEAK_SUBJECT =
  /interior|inside|indoor|detail|ceiling|altar|statue|plaque|sign\b|signage|exhibit|display|model|close[- ]?up|priest|worshipp|praying|monks|people|crowd|food|dish|menu|painting|panel|inscription|tomb|grave|toilet|lizard|sparrow|monkey|macaque|otter|squirrel|insect|butterfly|pansy|dragonfly|spider|snake|frog|tiger|\bcat\b|\bdog\b|decorations|text\b|written|replica|tank\b|mural|history gallery|bench/i;
const FREE_LICENCE = /^(cc0|cc[- ]by|public domain|pd\b|attribution)/i;

// Articles that pass the name checks but are about something else
const REJECT_ARTICLES = new Set([
  'Sun Yat-sen University',
  'Lim Bo Seng',
  'NTU Centre for Contemporary Art Singapore',
  'Supreme Court of Singapore',
  'Tiong Bahru Plaza', // a shopping mall, not the heritage estate
  'Tiong Bahru MRT station', // the station, not the heritage estate
]);

interface LandmarkImage {
  url: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl?: string;
  article: string;
}

interface Candidate {
  file: string; // without "File:"
  fromArticle?: string;
}

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
      .filter((t) => t.length > 2 && !['singapore', 'singapur', 'the', 'and', 'jpg', 'jpeg'].includes(t))
  );

function nameOverlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / ta.size;
}

/** Names to try, most specific first: "Haji Lane Street Art & Indie Shophouses" -> also "Haji Lane" */
function nameVariants(raw: string): string[] {
  const full = cleanName(raw);
  const beforeAmp = full.split(/\s*[&/]\s*/)[0].trim();
  const descriptors =
    /\s+(street art|indie shophouses|shophouses|courtyard|floral arches|ruins|rustic enclave|boardwalks?|coastal boardwalk|casuarina trails|trail|alleys|streamline moderne|spiral green roof|tree tunnel|spiral staircase|pastel|heritage|artisan|landmark|memorial landmark)\b.*$/i;
  const core = beforeAmp.replace(descriptors, '').trim();
  return [...new Set([full, beforeAmp, core].filter((n) => tokens(n).size > 0))];
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

// ---------- Candidate sources ----------

async function commonsSearch(query: string, limit = 15): Promise<string[]> {
  const data = await api(COMMONS_API, {
    action: 'query',
    list: 'search',
    srnamespace: '6',
    srlimit: String(limit),
    srsearch: query,
  });
  return (data?.query?.search ?? []).map((r: any) => String(r.title).replace(/^File:/, ''));
}

/** Lead image of the matching Wikipedia article (same name + location rules as before). */
async function articleImage(lm: Landmark, name: string): Promise<Candidate | null> {
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
    if (!file || REJECT_ARTICLES.has(page.title)) continue;
    const sameName = nameOverlap(name, page.title) >= 0.6 && nameOverlap(page.title, name) >= 0.5;
    const coord = page.coordinates?.[0];
    const placed = coord
      ? distanceKm(lm.latitude, lm.longitude, coord.lat, coord.lon) <= MAX_DISTANCE_KM
      : /singapore/i.test(page.title) || nameOverlap(name, page.title) >= 0.9;
    if (sameName && placed) return { file, fromArticle: page.title };
  }
  return null;
}

async function gatherCandidates(lm: Landmark): Promise<Candidate[]> {
  const found = new Map<string, Candidate>();
  const add = (c: Candidate) => {
    const existing = found.get(c.file);
    if (!existing) found.set(c.file, c);
    else if (c.fromArticle) found.set(c.file, { ...existing, fromArticle: c.fromArticle });
  };
  const qualityFilter = 'incategory:"Featured_pictures_on_Wikimedia_Commons|Quality_images|Valued_images"';

  for (const name of nameVariants(lm.name)) {
    const named = (files: string[]) => files.filter((f) => nameOverlap(name, f.replace(/[_.,()-]/g, ' ')) >= 0.6);
    named(await commonsSearch(`${name} ${qualityFilter}`)).forEach((file) => add({ file }));
    const article = await articleImage(lm, name);
    if (article) add(article);
    named(await commonsSearch(`${name} Singapore filetype:bitmap`)).forEach((file) => add({ file }));
    if (found.size >= 8) break;
    await sleep(120);
  }
  return [...found.values()].filter((c) => !NOT_A_PHOTO.test(c.file));
}

// ---------- Scoring ----------

interface FileInfo {
  title: string;
  width: number;
  height: number;
  thumburl: string;
  descriptionurl: string;
  author: string;
  license: string;
  licenseUrl?: string;
  quality: number;
  coord?: { lat: number; lon: number };
}

const fileKey = (name: string) => name.replace(/^File:/, '').replace(/_/g, ' ');

async function fileInfo(files: string[]): Promise<Map<string, FileInfo>> {
  const out = new Map<string, FileInfo>();
  for (let i = 0; i < files.length; i += 40) {
    const batch = files.slice(i, i + 40);
    const data = await api(COMMONS_API, {
      action: 'query',
      titles: batch.map((f) => `File:${f}`).join('|'),
      prop: 'imageinfo|categories|coordinates',
      iiprop: 'url|size|extmetadata',
      iiurlwidth: String(THUMB_WIDTH),
      iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl',
      clcategories: Object.keys(QUALITY_CATEGORIES).join('|'),
      cllimit: 'max',
      colimit: 'max',
    });
    for (const page of data?.query?.pages ?? []) {
      const info = page.imageinfo?.[0];
      if (page.missing || !info?.thumburl) continue;
      const license = stripHtml(info.extmetadata?.LicenseShortName?.value ?? '');
      if (!FREE_LICENCE.test(license)) continue;
      const quality = Math.max(0, ...(page.categories ?? []).map((c: any) => QUALITY_CATEGORIES[c.title] ?? 0));
      out.set(fileKey(page.title), {
        title: fileKey(page.title),
        width: info.width,
        height: info.height,
        thumburl: info.thumburl,
        descriptionurl: info.descriptionurl,
        author: stripHtml(info.extmetadata?.Artist?.value ?? '') || 'Unknown author',
        license,
        licenseUrl: info.extmetadata?.LicenseUrl?.value || undefined,
        quality,
        coord: page.coordinates?.[0],
      });
    }
    await sleep(120);
  }
  return out;
}

function score(c: Candidate, f: FileInfo): number {
  const ratio = f.width / f.height;
  let s = f.quality;
  if (ratio >= 1.2 && ratio <= 2.1) s += 2;
  else if (ratio < 1) s -= 4; // portrait crops badly into landscape cards
  if (f.width >= 2000) s += 1;
  if (f.width < 900) s -= 2;
  if (WEAK_SUBJECT.test(f.title)) s -= 5;
  if (c.fromArticle) s += 1.5; // editors picked it as the place's representative image
  return s;
}

async function findImage(lm: Landmark): Promise<(LandmarkImage & { score: number }) | null> {
  const candidates = await gatherCandidates(lm);
  if (candidates.length === 0) return null;
  const infos = await fileInfo(candidates.map((c) => c.file));

  let best: { c: Candidate; f: FileInfo; s: number } | null = null;
  for (const c of candidates) {
    const f = infos.get(fileKey(c.file));
    if (!f) continue;
    // Same-named places abroad (London's National Gallery, Taipei's Sun Yat-sen hall…) are ruled out:
    // a searched file must be geotagged near the landmark, or (if not geotagged) name Singapore in
    // its title. Article lead images were already matched by name and location.
    const near = f.coord ? distanceKm(lm.latitude, lm.longitude, f.coord.lat, f.coord.lon) <= MAX_DISTANCE_KM : null;
    if (near === false) continue;
    if (near === null && !c.fromArticle && !/singap/i.test(f.title)) continue;
    const s = score(c, f);
    if (!best || s > best.s) best = { c, f, s };
  }
  if (!best || best.s < MIN_SCORE) return null;

  const { c, f, s } = best;
  return {
    url: f.thumburl,
    sourceUrl: f.descriptionurl,
    author: f.author,
    license: f.license,
    licenseUrl: f.licenseUrl,
    article: c.fromArticle ? `Article: ${c.fromArticle} (${f.title})` : `Commons${f.quality ? ' reviewed' : ''}: ${f.title}`,
    score: s,
  };
}

async function main() {
  const landmarks: Landmark[] = [...CURATED_HIDDEN_GEMS, ...STB_TOURIST_ATTRACTIONS];
  const found: Record<string, LandmarkImage> = {};
  const missing: string[] = [];

  for (const [i, lm] of landmarks.entries()) {
    try {
      const image = await findImage(lm);
      if (image) {
        const { score: s, ...rest } = image;
        found[lm.id] = rest;
        console.log(`${String(i + 1).padStart(3)}/${landmarks.length} OK ${s.toFixed(1).padStart(4)} ${lm.name}  <- ${image.article}`);
      } else {
        missing.push(lm.name);
        console.log(`${String(i + 1).padStart(3)}/${landmarks.length} NONE      ${lm.name}`);
      }
    } catch (err: any) {
      missing.push(lm.name);
      console.log(`${String(i + 1).padStart(3)}/${landmarks.length} ERR       ${lm.name}: ${err?.message}`);
    }
    await sleep(200); // be polite to the Wikimedia APIs
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
