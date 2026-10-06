/**
 * Cheap abuse protection for the public API endpoints:
 * - /api/plan spends the owner's DeepSeek balance
 * - /api/route spends the owner's OneMap routing quota
 * Used by the Vercel functions and the Vite dev middleware.
 *
 * The rate limits are in-memory, so on Vercel they are per function instance — they
 * slow down casual abuse but are not a hard guarantee. For a hard limit, add Vercel
 * Firewall rate-limit rules on /api/plan and /api/route.
 */
import { MAX_BODY_BYTES, PlannerError } from './planner.js';

const RATE_WINDOW_MS = 10 * 60_000;
const MAX_TRACKED_IPS = 5000;

/** Sliding-window request counter per IP. */
function createRateLimiter(maxPerWindow: number, windowMs = RATE_WINDOW_MS) {
  const log = new Map<string, number[]>();
  return {
    /** Records a request; returns false when the IP is over its limit. */
    hit(ip: string, now: number): boolean {
      const recent = (log.get(ip) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= maxPerWindow) return false;
      recent.push(now);
      log.set(ip, recent);
      // Keep memory bounded on long-lived instances
      if (log.size > MAX_TRACKED_IPS) {
        for (const [key, times] of log) {
          if (times.every((t) => now - t >= windowMs)) log.delete(key);
        }
      }
      return true;
    },
    reset() {
      log.clear();
    },
  };
}

const planLimiter = createRateLimiter(20);
const routeLimiter = createRateLimiter(60);

// Browsers always send Origin on cross-site requests; block other websites from using our endpoints
function assertSameOrigin(origin?: string, host?: string) {
  if (!origin || !host) return;
  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch {
    // malformed Origin header — treat as foreign
  }
  if (originHost !== host) throw new PlannerError('Requests from other sites are not allowed.', 403);
}

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
  assertSameOrigin(origin, host);
  if (!planLimiter.hit(ip, now)) {
    throw new PlannerError('Too many planning requests. Please wait a few minutes and try again.', 429);
  }
}

export function guardRouteRequest(
  { ip, origin, host }: { ip: string; origin?: string; host?: string },
  now = Date.now()
): void {
  assertSameOrigin(origin, host);
  if (!routeLimiter.hit(ip, now)) {
    throw new PlannerError('Too many route requests. Please wait a few minutes and try again.', 429);
  }
}

export function resetRateLimit() {
  planLimiter.reset();
  routeLimiter.reset();
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
