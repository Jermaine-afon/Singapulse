/**
 * Vercel Serverless Function: GET /api/route?start=lat,lng&end=lat,lng&mode=walk|pt|cycle|drive
 * Real routes from OneMap, or a labelled straight-line estimate when OneMap isn't available.
 */
import { PlannerError } from '../server/planner.js';
import { getRequestMeta, guardRouteRequest } from '../server/requestGuard.js';
import { getRoute, parseRouteQuery } from '../server/routing.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Use GET.' });
  }

  try {
    guardRouteRequest(getRequestMeta(req.headers, req.socket?.remoteAddress));
    const route = await getRoute(parseRouteQuery(req.query ?? {}), {
      ONEMAP_TOKEN: process.env.ONEMAP_TOKEN,
      ONEMAP_EMAIL: process.env.ONEMAP_EMAIL,
      ONEMAP_PASSWORD: process.env.ONEMAP_PASSWORD,
    });
    return res.status(200).json(route);
  } catch (err: any) {
    const status = err instanceof PlannerError ? err.status : 500;
    if (!(err instanceof PlannerError)) console.error('Route error:', err);
    return res.status(status).json({ error: err instanceof PlannerError ? err.message : 'Unexpected route error.' });
  }
}
