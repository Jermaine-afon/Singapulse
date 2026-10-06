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

            const { generatePlan, PlannerError } = await server.ssrLoadModule('/server/planner.ts');
            try {
              const chunks: Buffer[] = [];
              for await (const chunk of req) chunks.push(chunk as Buffer);
              const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');

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
        '@': path.resolve(__dirname, '.'),
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
