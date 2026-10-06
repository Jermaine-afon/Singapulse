/**
 * AI itinerary planner (server-side only — holds the DeepSeek API key).
 * Used by the Vercel function api/plan.ts and the Vite dev middleware.
 *
 * DeepSeek API is OpenAI-compatible: https://api-docs.deepseek.com/
 */
import { SINGAPORE_LANDMARKS } from '../src/data/landmarks.js';
import type {
  ItineraryPlan,
  PlanRequest,
  PlanResponse,
  PlanStop,
  PlannerChatMessage,
  PlannerPreferences,
} from '../src/types/planner';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-flash';
const REQUEST_TIMEOUT_MS = 60_000;

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 1000;
const MAX_STOPS = 12;

export class PlannerError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const landmarkById = new Map(SINGAPORE_LANDMARKS.map((lm) => [lm.id, lm]));

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

// One compact line per landmark keeps the prompt small (~5k tokens for the full catalog)
const CATALOG_TEXT = SINGAPORE_LANDMARKS.map((lm) =>
  [
    lm.id,
    lm.name,
    lm.region,
    lm.category,
    lm.shelterLevel,
    clip(lm.bestTimeOfDay, 40),
    lm.recommendedDuration,
    lm.admission,
    clip(lm.nearestMrt, 40),
  ].join(' | ')
).join('\n');

const SYSTEM_PROMPT = `You are Singapulse's itinerary planner for visitors to Singapore.
You build realistic one-day plans and revise them when the user asks.

RULES
- Sightseeing stops MUST come from the LANDMARK CATALOG below. Use the exact id. Never invent landmarks.
- You may add "meal" and "break" stops as free text (e.g. "Lunch at Maxwell Food Centre"); they have no landmarkId.
- Keep stops inside the user's start and end time, in chronological order, with realistic travel time between them (group nearby regions together).
- Respect the pace: relaxed = 3-4 landmarks, balanced = 4-6, packed = 6-8.
- Include every "must visit" landmark unless impossible; say so in the reply if you leave one out.
- Use the weather: put full_shelter / partial_shelter stops in rainy or very hot hours, open_air stops in fair hours.
- When revising, change only what the user asked for and keep the rest of the plan.
- Notes are one short sentence on why the stop fits (timing, weather, food tip).

Respond with json only, in exactly this shape:
{
  "reply": "1-3 friendly sentences explaining the plan or what you changed",
  "plan": {
    "title": "short plan title",
    "summary": "one sentence overview",
    "stops": [
      { "time": "09:00", "durationMinutes": 60, "type": "landmark", "landmarkId": "fort-canning-tunnel", "title": "Fort Canning Tree Tunnel", "note": "Soft morning light and no queue." },
      { "time": "12:30", "durationMinutes": 60, "type": "meal", "title": "Lunch at Tiong Bahru Market", "note": "Try the chwee kueh." }
    ]
  }
}

LANDMARK CATALOG (id | name | region | category | shelter | best time | duration | admission | nearest MRT)
${CATALOG_TEXT}`;

// ---------- Request validation ----------

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const asString = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

function parseRequest(body: unknown): PlanRequest {
  if (!body || typeof body !== 'object') throw new PlannerError('Request body must be JSON.', 400);
  const raw = body as Record<string, any>;
  const p = (raw.preferences ?? {}) as Record<string, any>;

  const preferences: PlannerPreferences = {
    date: DATE_RE.test(p.date) ? p.date : '',
    startTime: TIME_RE.test(p.startTime) ? p.startTime : '09:00',
    endTime: TIME_RE.test(p.endTime) ? p.endTime : '18:00',
    interests: Array.isArray(p.interests) ? p.interests.map((i: unknown) => asString(i, 40)).filter(Boolean).slice(0, 10) : [],
    pace: ['relaxed', 'balanced', 'packed'].includes(p.pace) ? p.pace : 'balanced',
    startPoint: asString(p.startPoint, 120),
    mustVisitIds: Array.isArray(p.mustVisitIds) ? p.mustVisitIds.filter((id: unknown) => typeof id === 'string' && landmarkById.has(id)).slice(0, 10) : [],
    weatherSummary: asString(p.weatherSummary, 400),
  };

  const messages: PlannerChatMessage[] = (Array.isArray(raw.messages) ? raw.messages : [])
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_MESSAGES)
    .map((m: any) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    throw new PlannerError('The last message must be from the user.', 400);
  }

  const currentPlan = raw.currentPlan && Array.isArray(raw.currentPlan.stops) ? (raw.currentPlan as ItineraryPlan) : null;
  return { preferences, messages, currentPlan };
}

// ---------- Prompt building ----------

function describePreferences(p: PlannerPreferences): string {
  const mustVisit = p.mustVisitIds.map((id) => `${id} (${landmarkById.get(id)!.name})`).join(', ');
  return [
    `Date: ${p.date || 'not specified'}`,
    `Time window: ${p.startTime} to ${p.endTime}`,
    `Starting from: ${p.startPoint || 'city centre'}`,
    `Pace: ${p.pace}`,
    `Interests: ${p.interests.length ? p.interests.join(', ') : 'open to anything'}`,
    `Must visit: ${mustVisit || 'none'}`,
    `Weather: ${p.weatherSummary || 'unknown'}`,
  ].join('\n');
}

function buildMessages({ preferences, messages, currentPlan }: PlanRequest) {
  const latest = messages[messages.length - 1];
  const history = messages.slice(0, -1);

  const context = [
    `TRIP PREFERENCES\n${describePreferences(preferences)}`,
    currentPlan ? `CURRENT PLAN (json)\n${JSON.stringify(currentPlan)}` : '',
    `REQUEST\n${latest.content}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: context },
  ];
}

// ---------- Response validation ----------

function normaliseStop(raw: any): PlanStop | null {
  if (!raw || typeof raw !== 'object') return null;
  const time = TIME_RE.test(raw.time) ? raw.time : null;
  if (!time) return null;

  const durationMinutes = Math.min(300, Math.max(10, Math.round(Number(raw.durationMinutes) || 60)));
  const note = asString(raw.note, 240);

  if (raw.type === 'landmark' || raw.landmarkId) {
    const landmark = landmarkById.get(raw.landmarkId);
    if (!landmark) return null; // unknown ID — the AI made it up
    return { time, durationMinutes, type: 'landmark', landmarkId: landmark.id, title: landmark.name, note };
  }

  const title = asString(raw.title, 120);
  if (!title) return null;
  return { time, durationMinutes, type: raw.type === 'break' ? 'break' : 'meal', title, note };
}

function normaliseResponse(content: string): PlanResponse {
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new PlannerError('The AI returned an unreadable plan. Please try again.', 502);
  }

  const rawStops: unknown[] = Array.isArray(parsed?.plan?.stops) ? parsed.plan.stops : [];
  const stops = rawStops.slice(0, MAX_STOPS).map(normaliseStop);
  const validStops = stops.filter((s): s is PlanStop => s !== null).sort((a, b) => a.time.localeCompare(b.time));

  if (validStops.length === 0) {
    throw new PlannerError('The AI did not return any usable stops. Please try rephrasing.', 502);
  }

  return {
    reply: asString(parsed.reply, 1000) || 'Here is your plan.',
    plan: {
      title: asString(parsed.plan.title, 120) || 'Your Singapore day',
      summary: asString(parsed.plan.summary, 400),
      stops: validStops,
    },
    droppedStops: stops.length - validStops.length,
  };
}

// ---------- DeepSeek call ----------

async function callDeepSeek(apiKey: string, model: string, messages: ReturnType<typeof buildMessages>): Promise<string> {
  let res: Response;
  try {
    res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' }, // faster replies; planning doesn't need long reasoning
        max_tokens: 2500,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err: any) {
    const timedOut = err?.name === 'TimeoutError';
    throw new PlannerError(timedOut ? 'The AI took too long to respond. Please try again.' : 'Could not reach DeepSeek.', 504);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`DeepSeek error ${res.status}: ${detail.slice(0, 500)}`);
    if (res.status === 401) throw new PlannerError('DeepSeek rejected the API key. Check DEEPSEEK_API_KEY.', 502);
    if (res.status === 402) throw new PlannerError('The DeepSeek account has run out of balance.', 502);
    if (res.status === 429) throw new PlannerError('The AI is busy right now. Please wait a moment and try again.', 429);
    throw new PlannerError(`DeepSeek returned an error (${res.status}).`, 502);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

export async function generatePlan(body: unknown, opts: { apiKey?: string; model?: string }): Promise<PlanResponse> {
  if (!opts.apiKey) {
    throw new PlannerError('The AI planner is not configured. Add DEEPSEEK_API_KEY to the server environment.', 503);
  }

  const request = parseRequest(body);
  const messages = buildMessages(request);
  const model = opts.model || DEFAULT_MODEL;

  // JSON mode can occasionally return empty content — retry once
  let content = await callDeepSeek(opts.apiKey, model, messages);
  if (!content.trim()) content = await callDeepSeek(opts.apiKey, model, messages);
  if (!content.trim()) throw new PlannerError('The AI returned an empty response. Please try again.', 502);

  return normaliseResponse(content);
}
