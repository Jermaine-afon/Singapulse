import type { PlanRequest, PlanResponse } from '../types/planner';

// Slightly longer than the server's 50s DeepSeek budget, so server errors arrive first
const CLIENT_TIMEOUT_MS = 58_000;

/**
 * Calls the server-side AI planner (/api/plan). The DeepSeek key never reaches the browser.
 */
export async function requestPlan(request: PlanRequest): Promise<PlanResponse> {
  let res: Response;
  try {
    res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
  } catch (err: any) {
    if (err?.name === 'TimeoutError') throw new Error('The planner took too long to respond. Please try again.');
    throw new Error('Could not reach the planner. Check your connection and try again.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Planner request failed (${res.status}).`);
  }
  return data as PlanResponse;
}
