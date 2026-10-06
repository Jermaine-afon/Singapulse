import type { PlanRequest, PlanResponse } from '../types/planner';

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
    });
  } catch {
    throw new Error('Could not reach the planner. Check your connection and try again.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Planner request failed (${res.status}).`);
  }
  return data as PlanResponse;
}
