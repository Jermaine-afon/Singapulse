/**
 * Vercel Serverless Function: GET /api/live?buses=STOP:SERVICE,...&stations=CODE:LINE,...&lines=LINE,...
 * Live bus arrivals, platform crowd levels and MRT disruption alerts from LTA DataMall.
 * Returns { available: false } when LTA_ACCOUNT_KEY isn't configured, so the UI just hides the extras.
 */
import { PlannerError } from '../server/planner.js';
import { getRequestMeta, guardLiveRequest } from '../server/requestGuard.js';
import { getLiveTransit, parseLiveQuery } from '../server/lta.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Use GET.' });
  }

  try {
    guardLiveRequest(getRequestMeta(req.headers, req.socket?.remoteAddress));
    const live = await getLiveTransit(parseLiveQuery(req.query ?? {}), process.env.LTA_ACCOUNT_KEY);
    return res.status(200).json(live);
  } catch (err: any) {
    const status = err instanceof PlannerError ? err.status : 500;
    if (!(err instanceof PlannerError)) console.error('Live transit error:', err);
    return res.status(status).json({ error: err instanceof PlannerError ? err.message : 'Unexpected live transit error.' });
  }
}
