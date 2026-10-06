/**
 * Vercel Serverless Function: POST /api/plan
 * Generates or revises an AI itinerary with DeepSeek.
 */
import { generatePlan, PlannerError } from '../server/planner.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await generatePlan(body, {
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL,
    });
    return res.status(200).json(result);
  } catch (err: any) {
    const status = err instanceof PlannerError ? err.status : 500;
    const message = err instanceof PlannerError ? err.message : 'Unexpected planner error.';
    if (!(err instanceof PlannerError)) console.error('Planner error:', err);
    return res.status(status).json({ error: message });
  }
}
