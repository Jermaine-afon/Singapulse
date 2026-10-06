/**
 * DeepSeek API constants + a cheap connectivity check (no tokens spent).
 * https://api-docs.deepseek.com/
 */
export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
export const DEEPSEEK_DEFAULT_MODEL = 'deepseek-flash';

const CHECK_TIMEOUT_MS = 5000;

export interface DeepSeekHealth {
  name: string;
  status: 'connected' | 'not_configured' | 'invalid_key' | 'no_balance' | 'error';
  httpStatus: number | null;
  requiresKey: string;
  model: string;
  modelListed: boolean | null; // whether /models lists the configured model
  balanceAvailable: boolean | null; // never exposes the actual amount
  endpoint: string;
}

/**
 * Checks the key against GET /models and GET /user/balance. Neither call consumes tokens.
 */
export async function checkDeepSeek(apiKey: string | undefined, model: string | undefined): Promise<DeepSeekHealth> {
  const result: DeepSeekHealth = {
    name: 'DeepSeek AI (Itinerary Planner)',
    status: 'not_configured',
    httpStatus: null,
    requiresKey: 'DEEPSEEK_API_KEY',
    model: model || DEEPSEEK_DEFAULT_MODEL,
    modelListed: null,
    balanceAvailable: null,
    endpoint: `${DEEPSEEK_BASE_URL}/chat/completions`,
  };
  if (!apiKey) return result;

  const get = (path: string) =>
    fetch(`${DEEPSEEK_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });

  const [modelsRes, balanceRes] = await Promise.allSettled([get('/models'), get('/user/balance')]);

  if (modelsRes.status === 'rejected') {
    return { ...result, status: 'error' };
  }

  result.httpStatus = modelsRes.value.status;
  if (modelsRes.value.status === 401) return { ...result, status: 'invalid_key' };
  if (!modelsRes.value.ok) return { ...result, status: 'error' };

  if (balanceRes.status === 'fulfilled' && balanceRes.value.ok) {
    const balance = await balanceRes.value.json().catch(() => null);
    if (typeof balance?.is_available === 'boolean') result.balanceAvailable = balance.is_available;
  }

  const models = await modelsRes.value.json().catch(() => null);
  const modelIds: string[] = Array.isArray(models?.data) ? models.data.map((m: any) => m?.id) : [];
  // Informational only: DeepSeek also accepts alias names that may not appear in /models
  result.modelListed = modelIds.length > 0 ? modelIds.includes(result.model) : null;
  if (result.balanceAvailable === false) return { ...result, status: 'no_balance' };

  return { ...result, status: 'connected' };
}
