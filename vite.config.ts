import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // Load all .env vars (not just VITE_*) for server-side dev middleware only — never exposed to the client
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        // Dev-server equivalent of the Vercel function api/live.ts
        name: 'api-live-plugin',
        configureServer(server) {
          server.middlewares.use('/api/live', async (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            const { PlannerError } = await server.ssrLoadModule('/server/planner.ts');
            const { guardLiveRequest, getRequestMeta } = await server.ssrLoadModule('/server/requestGuard.ts');
            const { getLiveTransit, parseLiveQuery } = await server.ssrLoadModule('/server/lta.ts');
            try {
              guardLiveRequest(getRequestMeta(req.headers, req.socket.remoteAddress));
              const query = Object.fromEntries(new URL(req.url ?? '', 'http://localhost').searchParams);
              res.end(JSON.stringify(await getLiveTransit(parseLiveQuery(query), env.LTA_ACCOUNT_KEY)));
            } catch (err: any) {
              const known = err instanceof PlannerError;
              if (!known) console.error('Live transit error:', err);
              res.statusCode = known ? err.status : 500;
              res.end(JSON.stringify({ error: known ? err.message : 'Unexpected live transit error.' }));
            }
          });
        },
      },
      {
        // Dev-server equivalent of the Vercel function api/route.ts
        name: 'api-route-plugin',
        configureServer(server) {
          server.middlewares.use('/api/route', async (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            if (req.method !== 'GET') {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Use GET.' }));
              return;
            }
            const { PlannerError } = await server.ssrLoadModule('/server/planner.ts');
            const { guardRouteRequest, getRequestMeta } = await server.ssrLoadModule('/server/requestGuard.ts');
            const { getRoute, parseRouteQuery } = await server.ssrLoadModule('/server/routing.ts');
            try {
              guardRouteRequest(getRequestMeta(req.headers, req.socket.remoteAddress));
              const query = Object.fromEntries(new URL(req.url ?? '', 'http://localhost').searchParams);
              const route = await getRoute(parseRouteQuery(query), {
                ONEMAP_TOKEN: env.ONEMAP_TOKEN,
                ONEMAP_EMAIL: env.ONEMAP_EMAIL,
                ONEMAP_PASSWORD: env.ONEMAP_PASSWORD,
              });
              res.end(JSON.stringify(route));
            } catch (err: any) {
              const known = err instanceof PlannerError;
              if (!known) console.error('Route error:', err);
              res.statusCode = known ? err.status : 500;
              res.end(JSON.stringify({ error: known ? err.message : 'Unexpected route error.' }));
            }
          });
        },
      },
      {
        // Dev-server equivalent of the Vercel function api/plan.ts
        name: 'api-plan-plugin',
        configureServer(server) {
          server.middlewares.use('/api/plan', async (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Use POST.' }));
              return;
            }

            const { generatePlan, PlannerError, MAX_BODY_BYTES } = await server.ssrLoadModule('/server/planner.ts');
            const { guardPlanRequest, getRequestMeta } = await server.ssrLoadModule('/server/requestGuard.ts');
            try {
              // Read headers/IP before the body: stopping the body read early destroys req.socket
              const meta = getRequestMeta(req.headers, req.socket.remoteAddress);
              const chunks: Buffer[] = [];
              let bodyBytes = 0;
              for await (const chunk of req) {
                bodyBytes += (chunk as Buffer).length;
                if (bodyBytes > MAX_BODY_BYTES) break; // stop reading oversized bodies early
                chunks.push(chunk as Buffer);
              }
              guardPlanRequest({ ...meta, bodyBytes });

              let body: unknown;
              try {
                body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
              } catch {
                throw new PlannerError('Request body must be JSON.', 400);
              }

              const result = await generatePlan(body, {
                apiKey: env.DEEPSEEK_API_KEY,
                model: env.DEEPSEEK_MODEL,
              });
              res.end(JSON.stringify(result));
            } catch (err: any) {
              const known = err instanceof PlannerError;
              if (!known) console.error('Planner error:', err);
              res.statusCode = known ? err.status : 500;
              res.end(JSON.stringify({ error: known ? err.message : 'Unexpected planner error.' }));
            }
          });
        },
      },
      {
        name: 'api-health-plugin',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/health' || req.url === '/api/health/') {
              try {
                const testWeather = await fetch('https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast')
                  .then((r) => ({ ok: r.ok, status: r.status }))
                  .catch(() => ({ ok: false, status: 500 }));

                const testOneMap = await fetch(
                  'https://www.onemap.gov.sg/api/common/elastic/search?searchVal=orchard&returnGeom=Y&getAddrDetails=Y&pageNum=1'
                )
                  .then((r) => ({ ok: r.ok, status: r.status }))
                  .catch(() => ({ ok: false, status: 500 }));

                const { checkDeepSeek } = await server.ssrLoadModule('/server/deepseek.ts');
                const deepSeek = await checkDeepSeek(env.DEEPSEEK_API_KEY, env.DEEPSEEK_MODEL);
                const { describeOneMapRouting } = await server.ssrLoadModule('/server/oneMapAuth.ts');
                const oneMapRouting = describeOneMapRouting(env);
                const { checkLta } = await server.ssrLoadModule('/server/lta.ts');
                const ltaDataMall = await checkLta(env.LTA_ACCOUNT_KEY);

                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    status: 'ok',
                    application: 'Singapulse - Singapore Tourist Discovery & Weather Predictor',
                    timestamp: new Date().toISOString(),
                    integrations: {
                      dataGovSgWeather: {
                        name: 'Singapore NEA Real-Time Weather (Data.gov.sg)',
                        status: testWeather.ok ? 'connected' : 'error',
                        httpStatus: testWeather.status,
                        requiresKey: false,
                      },
                      oneMap: {
                        name: 'OneMap Singapore Geospatial Search',
                        status: testOneMap.ok ? 'connected' : 'error',
                        httpStatus: testOneMap.status,
                        requiresKey: '3-day token for routing; public search for geocoding',
                      },
                      deepSeek,
                      oneMapRouting,
                      ltaDataMall,
                    },
                  })
                );
                return;
              } catch (err: any) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ status: 'error', message: err.message }));
                return;
              }
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
