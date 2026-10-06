/**
 * Builds a printable/offline PDF of the visitor's saved trail.
 * Loaded on demand (dynamic import) so jsPDF never weighs down the app.
 *
 * Map: OneMap static map (public, CORS-enabled) with our own numbered markers drawn on top.
 * Photos: the landmarks' Wikimedia Commons photos, each printed with its required credit.
 * Font: Inter (SIL OFL, /public/fonts), embedded so the PDF matches the app.
 */
import { jsPDF } from 'jspdf';
import type { Landmark } from '../types';

// ---------- Page geometry (mm, A4 portrait) ----------
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 9;
const BOTTOM_LIMIT = PAGE_H - 18;

// ---------- Colours (design tokens) ----------
type RGB = [number, number, number];
const INK: RGB = [14, 15, 12];
const BODY: RGB = [69, 71, 69];
const MUTE: RGB = [107, 109, 106];
const SAGE: RGB = [232, 235, 230];
const LINE: RGB = [211, 216, 208];
const LIME: RGB = [159, 232, 112];
const INK_DEEP: RGB = [22, 51, 0];

const CATEGORY_LABELS: Record<Landmark['category'], string> = {
  architecture: 'Architecture',
  heritage: 'Heritage',
  greenery: 'Greenery & trails',
  eats_culture: 'Eats & culture',
  coastal: 'Coast & islands',
};

const SHELTER_LABELS: Record<Landmark['shelterLevel'], string> = {
  full_shelter: 'Fully sheltered (rain-safe)',
  partial_shelter: 'Partly sheltered',
  open_air: 'Open air',
};

/** Data text can carry stray HTML and mis-encoded symbols from its sources. */
const clean = (text: string | undefined) =>
  (text ?? '')
    .replace(/<[^>]*>?/g, '')
    .replace(/â„¢/g, '™')
    .replace(/,(?=[A-Za-z])/g, ', ') // "2am,Conservatories" -> "2am, Conservatories"
    .replace(/\s+/g, ' ')
    .trim();

const hasRealMrt = (mrt: string) => Boolean(mrt) && !/^nearby/i.test(mrt);

// ---------- Asset loading ----------

const toBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

async function registerFonts(doc: jsPDF): Promise<boolean> {
  try {
    const faces: [string, string][] = [
      ['Inter-400.ttf', 'Inter'],
      ['Inter-600.ttf', 'InterSemi'],
      ['Inter-900.ttf', 'InterBlack'],
    ];
    const files = await Promise.all(faces.map(([file]) => fetch(`/fonts/${file}`).then((r) => r.arrayBuffer())));
    faces.forEach(([file, family], i) => {
      doc.addFileToVFS(file, toBase64(files[i]));
      doc.addFont(file, family, 'normal');
    });
    return true;
  } catch {
    return false; // fall back to the built-in Helvetica
  }
}

/** Loads an image and crops it to fill w×h (like object-fit: cover); null if it can't load. */
function loadCoverImage(url: string, w: number, h: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => resolve(null), 10_000);
    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const sw = w / scale;
        const sh = h / scale;
        ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

// ---------- Overview map (Web Mercator, matching OneMap's static map) ----------

const MAP_PX_W = 512;
const MAP_PX_H = 320;
const MAP_PAD_PX = 48;

const worldX = (lng: number, z: number) => ((lng + 180) / 360) * 256 * 2 ** z;
const worldY = (lat: number, z: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * 2 ** z;
};
const unprojectLat = (y: number, z: number) => {
  const n = Math.PI - (2 * Math.PI * y) / (256 * 2 ** z);
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
};

interface OverviewMap {
  dataUrl: string;
  /** Marker positions in image pixels, in trail order */
  points: [number, number][];
}

async function loadOverviewMap(landmarks: Landmark[]): Promise<OverviewMap | null> {
  if (landmarks.length === 0) return null;
  // Highest zoom (16 → 11) that fits every place with padding
  let zoom = 11;
  for (let z = 16; z >= 11; z--) {
    const xs = landmarks.map((lm) => worldX(lm.longitude, z));
    const ys = landmarks.map((lm) => worldY(lm.latitude, z));
    if (Math.max(...xs) - Math.min(...xs) <= MAP_PX_W - MAP_PAD_PX * 2 && Math.max(...ys) - Math.min(...ys) <= MAP_PX_H - MAP_PAD_PX * 2) {
      zoom = z;
      break;
    }
  }
  const xs = landmarks.map((lm) => worldX(lm.longitude, zoom));
  const ys = landmarks.map((lm) => worldY(lm.latitude, zoom));
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const centerLng = (cx / (256 * 2 ** zoom)) * 360 - 180;
  const centerLat = unprojectLat(cy, zoom);

  const url =
    'https://www.onemap.gov.sg/api/staticmap/getStaticImage?layerchosen=grey' +
    `&zoom=${zoom}&width=${MAP_PX_W}&height=${MAP_PX_H}&latitude=${centerLat.toFixed(6)}&longitude=${centerLng.toFixed(6)}`;
  const dataUrl = await loadCoverImage(url, MAP_PX_W * 2, MAP_PX_H * 2);
  if (!dataUrl) return null;
  return {
    dataUrl,
    points: landmarks.map((_, i) => [xs[i] - cx + MAP_PX_W / 2, ys[i] - cy + MAP_PX_H / 2]),
  };
}

// ---------- Document ----------

export async function downloadTrailPdf(landmarks: Landmark[], options: { savedOn?: Date } = {}): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const hasInter = await registerFonts(doc);
  const font = (weight: 400 | 600 | 900, size: number, color: RGB = INK) => {
    if (hasInter) doc.setFont(weight === 900 ? 'InterBlack' : weight === 600 ? 'InterSemi' : 'Inter', 'normal');
    else doc.setFont('helvetica', weight === 400 ? 'normal' : 'bold');
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const lineHeight = (size: number, factor = 1.4) => (size * factor * 25.4) / 72; // pt → mm

  // Load map and photos in parallel
  const PHOTO_W = 62;
  const PHOTO_H = 46.5;
  const [overview, photos] = await Promise.all([
    loadOverviewMap(landmarks),
    Promise.all(
      landmarks.map((lm) => (lm.imageUrl ? loadCoverImage(lm.imageUrl.replace(/\/960px-/, '/500px-'), 620, 465) : Promise.resolve(null)))
    ),
  ]);

  // ---- Cover band ----
  const savedOn = options.savedOn ?? new Date();
  doc.setFillColor(...SAGE);
  doc.rect(0, 0, PAGE_W, 54, 'F');
  font(900, 12);
  doc.text('Singapulse', MARGIN, 17);
  doc.setFillColor(...LIME);
  doc.circle(MARGIN + doc.getTextWidth('Singapulse') + 2, 15.6, 1.1, 'F');
  font(900, 30);
  doc.text('My Singapore trail', MARGIN, 36);
  font(400, 10.5, BODY);
  const dateText = savedOn.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`${landmarks.length} ${landmarks.length === 1 ? 'place' : 'places'} · Saved ${dateText}`, MARGIN, 45);

  let y = 62;

  // ---- Overview map with numbered markers ----
  if (overview) {
    const mapW = CONTENT_W;
    const mapH = (CONTENT_W * MAP_PX_H) / MAP_PX_W;
    doc.addImage(overview.dataUrl, 'JPEG', MARGIN, y, mapW, mapH);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, y, mapW, mapH);
    const scale = mapW / MAP_PX_W;
    overview.points.forEach(([px, py], i) => {
      const mx = MARGIN + px * scale;
      const my = y + py * scale;
      doc.setFillColor(255, 255, 255);
      doc.circle(mx, my, 3.4, 'F');
      doc.setFillColor(...INK);
      doc.circle(mx, my, 2.8, 'F');
      font(600, 7.5, [255, 255, 255]);
      doc.text(String(i + 1), mx, my + 0.95, { align: 'center' });
    });
    y += mapH + 4;
    font(400, 7.5, MUTE);
    doc.text('Map: OneMap © Singapore Land Authority. Numbers match the places below.', MARGIN, y);
    y += 9;
  }

  // ---- Places ----
  const RIGHT_X = MARGIN + PHOTO_W + 6;
  const RIGHT_W = PAGE_W - MARGIN - RIGHT_X;

  landmarks.forEach((lm, i) => {
    const photo = photos[i];
    const name = clean(lm.name);
    const meta = [CATEGORY_LABELS[lm.category], clean(lm.neighborhood), lm.region].filter(Boolean).join(' · ');

    const facts: [string, string][] = [
      ['Address', clean(lm.address)],
      ...(hasRealMrt(lm.nearestMrt) ? ([['Nearest MRT', clean(lm.nearestMrt)]] as [string, string][]) : []),
      // STB entries' "best time" is a truncated copy of their opening hours, which are shown in full below
      ...(!lm.isStbAttraction ? ([['Best time', clean(lm.bestTimeOfDay)]] as [string, string][]) : []),
      ['Time needed', clean(lm.recommendedDuration)],
      ...(lm.openingHours ? ([['Opening hours', clean(lm.openingHours)]] as [string, string][]) : []),
      // STB entries carry placeholder admission data, so only curated places state it
      ...(!lm.isStbAttraction ? ([['Entry', lm.admission === 'Free' ? 'Free' : 'Paid']] as [string, string][]) : []),
      ['Shelter', SHELTER_LABELS[lm.shelterLevel]],
    ].filter(([, value]) => value) as [string, string][];

    // Measure the block so it never splits across pages
    font(600, 14);
    const nameLines = doc.splitTextToSize(name, CONTENT_W - 10);
    const factLines = facts.map(([label, value]) => {
      font(400, 9);
      return { label, lines: doc.splitTextToSize(value, RIGHT_W - 26) as string[] };
    });
    const factsH = factLines.reduce((h, f) => h + f.lines.length * lineHeight(9, 1.35) + 1.6, 0);
    font(400, 9.5);
    const description = clean(lm.description);
    const descLines = doc.splitTextToSize(description, CONTENT_W) as string[];
    const tips: [string, string][] = lm.isStbAttraction
      ? []
      : ([
          ['Local tip', clean(lm.secretLore)],
          ['Food nearby', clean(lm.localFoodTip)],
        ].filter(([, t]) => t) as [string, string][]);
    const tipBlocks = tips.map(([label, text]) => {
      font(400, 9);
      return { label, lines: doc.splitTextToSize(text, CONTENT_W - 10) as string[] };
    });
    const credit = lm.imageCredit && photo ? clean(`Photo: ${lm.imageCredit.author} · ${lm.imageCredit.license} · Wikimedia Commons`) : '';
    font(400, 6.5);
    const creditLines = credit ? (doc.splitTextToSize(credit, PHOTO_W) as string[]).slice(0, 2) : [];

    const headerH = nameLines.length * lineHeight(14, 1.25) + lineHeight(9.5) + 3;
    const leftH = photo ? PHOTO_H + 2 + creditLines.length * lineHeight(6.5, 1.3) : 0;
    const rowH = Math.max(leftH, factsH);
    const tipsH = tipBlocks.reduce((h, b) => h + 8 + b.lines.length * lineHeight(9, 1.35) + 3, 0);
    const blockH = headerH + rowH + 4 + descLines.length * lineHeight(9.5, 1.45) + 3 + tipsH + 6;

    // Start the place here if its title and photo/facts row fit; the description and tips
    // check for room themselves and continue on the next page when needed
    if (y + Math.min(headerH + rowH, blockH) > BOTTOM_LIMIT) {
      doc.addPage();
      y = MARGIN;
    }

    // Number + name
    doc.setFillColor(...INK);
    doc.circle(MARGIN + 3.6, y + 1.2, 3.6, 'F');
    font(600, 9, LIME);
    doc.text(String(i + 1), MARGIN + 3.6, y + 2.4, { align: 'center' });
    font(600, 14);
    doc.text(nameLines, MARGIN + 10, y + 3, { lineHeightFactor: 1.25 });
    y += nameLines.length * lineHeight(14, 1.25) + 1;
    font(400, 9.5, BODY);
    doc.text(meta, MARGIN + 10, y + 2);
    y += lineHeight(9.5) + 3;

    // Photo (left) and facts (right)
    const rowTop = y;
    if (photo) {
      doc.addImage(photo, 'JPEG', MARGIN, rowTop, PHOTO_W, PHOTO_H);
      if (creditLines.length) {
        font(400, 6.5, MUTE);
        doc.text(creditLines, MARGIN, rowTop + PHOTO_H + 3, { lineHeightFactor: 1.3 });
      }
    }
    let fy = rowTop + 3;
    const factsX = photo ? RIGHT_X : MARGIN;
    factLines.forEach(({ label, lines }) => {
      font(600, 9);
      doc.text(label, factsX, fy);
      font(400, 9, BODY);
      doc.text(lines, factsX + 26, fy, { lineHeightFactor: 1.35 });
      fy += lines.length * lineHeight(9, 1.35) + 1.6;
    });
    y = rowTop + (photo ? rowH : factsH) + 4;

    // Description
    font(400, 9.5, BODY);
    if (y + descLines.length * lineHeight(9.5, 1.45) > BOTTOM_LIMIT) {
      doc.addPage();
      y = MARGIN;
    }
    doc.text(descLines, MARGIN, y + 3, { lineHeightFactor: 1.45 });
    y += descLines.length * lineHeight(9.5, 1.45) + 3;

    // Tips (curated places)
    tipBlocks.forEach(({ label, lines }) => {
      const h = 8 + lines.length * lineHeight(9, 1.35);
      if (y + h > BOTTOM_LIMIT) {
        doc.addPage();
        y = MARGIN;
      }
      doc.setFillColor(...SAGE);
      doc.roundedRect(MARGIN, y, CONTENT_W, h, 2.5, 2.5, 'F');
      font(600, 9, INK_DEEP);
      doc.text(label, MARGIN + 5, y + 5.5);
      font(400, 9, BODY);
      doc.text(lines, MARGIN + 5, y + 10, { lineHeightFactor: 1.35 });
      y += h + 3;
    });

    // Divider between places
    if (i < landmarks.length - 1) {
      y += 2;
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 8;
    }
  });

  // ---- Footers ----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    font(400, 7.5, MUTE);
    doc.text('Singapulse · My Singapore trail', MARGIN, FOOTER_Y);
    doc.text(`Page ${p} of ${pages}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' });
  }

  const stamp = savedOn.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }); // YYYY-MM-DD
  doc.save(`singapulse-trail-${stamp}.pdf`);
}
