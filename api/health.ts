/**
 * Vercel Serverless Function: /api/health
 * Checks live connectivity to Data.gov.sg, OneMap and DeepSeek APIs
 */
import { checkDeepSeek } from '../server/deepseek.js';
import { describeOneMapRouting } from '../server/oneMapAuth.js';
import { checkLta } from '../server/lta.js';

export default async function handler(req: any, res: any) {
  // Allow cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();

  try {
    // 1. Ping Data.gov.sg Two-Hour Forecast API
    const weatherPromise = fetch('https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast')
      .then((r) => ({ ok: r.ok, status: r.status, error: null }))
      .catch((e) => ({ ok: false, status: 500, error: e.message }));

    // 2. Ping OneMap Elastic Search API
const oneMapPromise = fetch(
  'https://www.onemap.gov.sg/api/common/elastic/search?searchVal=orchard&returnGeom=Y&getAddrDetails=Y&pageNum=1',
  {
    headers: {
      Authorization: process.env.ONEMAP_TOKEN || ''
    }
  }
)
  .then(async (r) => {
    const data = await r.json();

    return {
      ok: r.ok && !data.error,
      status: r.status,
      error: data.error || null
    };
  })
  .catch((e) => ({
    ok: false,
    status: 500,
    error: e.message
  }));
    // 3. Check DeepSeek key, balance and model (no tokens spent)
    const deepSeekPromise = checkDeepSeek(process.env.DEEPSEEK_API_KEY, process.env.DEEPSEEK_MODEL);

    // 4. Check LTA DataMall key (one cheap train-alerts call)
    const ltaPromise = checkLta(process.env.LTA_ACCOUNT_KEY);

    const [weatherRes, oneMapRes, deepSeekRes, ltaRes] = await Promise.all([weatherPromise, oneMapPromise, deepSeekPromise, ltaPromise]);

    // Token status only (and its expiry date) — never the token itself
    const oneMapRouting = describeOneMapRouting(process.env);
    const isAllHealthy =
      weatherRes.ok && oneMapRes.ok && deepSeekRes.status === 'connected' && oneMapRouting.status === 'configured';

    return res.status(200).json({
      status: isAllHealthy ? 'ok' : 'degraded',
      application: 'Singapulse - Singapore Tourist Discovery & Weather Predictor',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      integrations: {
        dataGovSgWeather: {
          name: 'Singapore NEA Real-Time Weather (Data.gov.sg)',
          status: weatherRes.ok ? 'connected' : 'error',
          httpStatus: weatherRes.status || 500,
          requiresKey: false,
          endpoint: 'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast'
        },
        oneMap: {
          name: 'OneMap Singapore Geospatial Search',
          status: oneMapRes.ok ? 'connected' : 'error',
          httpStatus: oneMapRes.status || 500,
          requiresKey: 'OneMap access token',
          endpoint: 'https://www.onemap.gov.sg/api/common/elastic/search'
        },
        deepSeek: deepSeekRes,
        oneMapRouting,
        ltaDataMall: ltaRes
      }
    });
  } catch (error: any) {
    return res.status(200).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error.message || 'Health check error'
    });
  }
}
