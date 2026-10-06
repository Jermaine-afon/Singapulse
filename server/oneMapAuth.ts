/**
 * OneMap access tokens (server-side only).
 *
 * - ONEMAP_TOKEN: a token pasted into the environment. OneMap tokens expire after 3 days.
 * - ONEMAP_EMAIL + ONEMAP_PASSWORD (optional): when set, a fresh token is fetched
 *   automatically whenever the current one is missing, expiring or rejected.
 */
export const ONEMAP_BASE_URL = 'https://www.onemap.gov.sg';
const TOKEN_URL = `${ONEMAP_BASE_URL}/api/auth/post/getToken`;
const REFRESH_MARGIN_MS = 10 * 60_000;

export interface OneMapEnv {
  ONEMAP_TOKEN?: string;
  ONEMAP_EMAIL?: string;
  ONEMAP_PASSWORD?: string;
}

/** Reads a JWT's `exp` (ms since epoch) without verifying it; null if absent/unreadable. */
export function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

const isUsable = (token: string | undefined, now: number): token is string => {
  if (!token) return false;
  const exp = getTokenExpiry(token);
  return exp === null || exp - now > REFRESH_MARGIN_MS;
};

// Token fetched with email/password, cached for the life of the server instance
let mintedToken: string | undefined;

async function mintToken(email: string, password: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || typeof data?.access_token !== 'string') {
    throw new Error(`OneMap token request failed (${res.status})`);
  }
  mintedToken = data.access_token;
  return data.access_token;
}

/**
 * Returns a usable token, or null when routing isn't configured or the token has expired
 * with no way to renew it. `forceRefresh` discards a token OneMap just rejected.
 */
export async function getOneMapToken(env: OneMapEnv, { forceRefresh = false, now = Date.now() } = {}): Promise<string | null> {
  const canMint = Boolean(env.ONEMAP_EMAIL && env.ONEMAP_PASSWORD);

  if (!forceRefresh) {
    if (isUsable(mintedToken, now)) return mintedToken;
    if (isUsable(env.ONEMAP_TOKEN, now)) return env.ONEMAP_TOKEN;
  }
  if (canMint) {
    try {
      return await mintToken(env.ONEMAP_EMAIL!, env.ONEMAP_PASSWORD!);
    } catch (err: any) {
      console.error('OneMap token renewal failed:', err?.message);
    }
  }
  return null;
}

export interface OneMapRoutingHealth {
  name: string;
  status: 'configured' | 'expired' | 'not_configured';
  autoRenew: boolean;
  /** When the configured ONEMAP_TOKEN expires (ISO); never the token itself */
  tokenExpiresAt: string | null;
}

export function describeOneMapRouting(env: OneMapEnv, now = Date.now()): OneMapRoutingHealth {
  const autoRenew = Boolean(env.ONEMAP_EMAIL && env.ONEMAP_PASSWORD);
  const exp = env.ONEMAP_TOKEN ? getTokenExpiry(env.ONEMAP_TOKEN) : null;
  const tokenValid = Boolean(env.ONEMAP_TOKEN) && (exp === null || exp > now);
  return {
    name: 'OneMap Routing (Getting there)',
    status: tokenValid || autoRenew ? 'configured' : env.ONEMAP_TOKEN ? 'expired' : 'not_configured',
    autoRenew,
    tokenExpiresAt: exp ? new Date(exp).toISOString() : null,
  };
}

export function resetOneMapTokenCache() {
  mintedToken = undefined;
}
