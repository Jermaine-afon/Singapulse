/**
 * Cheap abuse protection for the public /api/plan endpoint, which spends the
 * owner's DeepSeek balance. Used by api/plan.ts and the Vite dev middleware.
 *
 * The rate limit is in-memory, so on Vercel it is per function instance — it
 * slows down casual abuse but is not a hard guarantee. For a hard limit, add a
 * Vercel Firewall rate-limit rule on /api/plan.
 */
import { MAX_BODY_BYTES, PlannerError } from './planner.js';

const RATE_WINDOW_MS = 10 * 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const MAX_TRACKED_IPS = 5000;

const requestLog = new Map<string, number[]>();

export interface PlanRequestMeta {
  ip: string;
  origin?: string;
  host?: string;
  bodyBytes: number;
}

export function guardPlanRequest({ ip, origin, host, bodyBytes }: PlanRequestMeta, now = Date.now()): void {
  if (bodyBytes > MAX_BODY_BYTES) {
    throw new PlannerError('Request is too large.', 413);
  }

  // Browsers always send Origin on cross-site POSTs; block other websites from using this endpoint
  if (origin && host) {
    let originHost = '';
    try {
      originHost = new URL(origin).host;
    } catch {
      // malformed Origin header — treat as foreign
    }
    if (originHost !== host) throw new PlannerError('Requests from other sites are not allowed.', 403);
  }

  const recent = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    throw new PlannerError('Too many planning requests. Please wait a few minutes and try again.', 429);
  }
  recent.push(now);
  requestLog.set(ip, recent);

  // Keep memory bounded on long-lived instances
  if (requestLog.size > MAX_TRACKED_IPS) {
    for (const [key, times] of requestLog) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) requestLog.delete(key);
    }
  }
}

export function resetRateLimit() {
  requestLog.clear();
}

const firstHeader = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Reads client IP / origin / host from Node-style request headers (Vercel and Vite dev). */
export function getRequestMeta(headers: Record<string, string | string[] | undefined>, fallbackIp = 'unknown') {
  const forwardedFor = firstHeader(headers['x-forwarded-for'])?.split(',')[0]?.trim();
  return {
    ip: forwardedFor || firstHeader(headers['x-real-ip']) || fallbackIp,
    origin: firstHeader(headers.origin),
    host: firstHeader(headers['x-forwarded-host']) || firstHeader(headers.host),
  };
}
