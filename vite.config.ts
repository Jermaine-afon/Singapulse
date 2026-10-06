import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
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
                    application: 'Kaki Trails - Singapore Tourist Discovery & Weather Predictor',
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
