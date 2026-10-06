import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodePolyline, getRoute, normaliseDirectRoute, normaliseTransitRoute, parseRouteQuery } from './routing';
import { describeOneMapRouting, getOneMapToken, getTokenExpiry, resetOneMapTokenCache } from './oneMapAuth';
import { estimateRoute, haversineKm } from '../src/data/routeEstimate';

const MARINA_BAY = { lat: 1.2834, lng: 103.8598 };
const FORT_CANNING = { lat: 1.2955, lng: 103.8457 };

/** Unsigned JWT with the given expiry (seconds since epoch) */
const jwt = (expSeconds: number) =>
  `x.${Buffer.from(JSON.stringify({ exp: expSeconds })).toString('base64url')}.y`;
const validToken = () => jwt(Math.floor(Date.now() / 1000) + 3 * 24 * 3600);
const expiredToken = () => jwt(Math.floor(Date.now() / 1000) - 3600);

const json = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) }) as Response;

const WALK_RESPONSE = {
  status_message: 'Found route between points',
  route_geometry: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
  route_instructions: [
    ['Head', 'BAYFRONT AVENUE', 400, '1.2834,103.8598', 300, '400m', 'North', 'north', 'walking'],
    ['Left', 'STAMFORD ROAD', 1500, '1.29,103.85', 1200, '1.5km', 'West', 'west', 'walking'],
  ],
  route_summary: { start_point: 'BAYFRONT AVENUE', end_point: 'FORT CANNING', total_time: 1560, total_distance: 2150 },
};

const PT_RESPONSE = {
  plan: {
    itineraries: [
      {
        duration: 1320,
        fare: '1.47',
        transfers: 0,
        legs: [
          { mode: 'WALK', distance: 210, duration: 180, from: { name: 'Origin' }, to: { name: 'BAYFRONT MRT STATION' }, legGeometry: { points: '_p~iF~ps|U' } },
          { mode: 'SUBWAY', route: 'DT', distance: 2900, duration: 420, from: { name: 'BAYFRONT MRT STATION', stopCode: 'CE1/DT16' }, to: { name: 'FORT CANNING MRT STATION' }, numIntermediateStops: 2 },
          { mode: 'BUS', route: '7', routeShortName: '7', distance: 900, duration: 300, from: { name: 'OPP FORT CANNING', stopId: 'FERRY:04167' }, to: { name: 'BT TIMAH RD' }, numIntermediateStops: 0 },
          { mode: 'WALK', distance: 150, duration: 120, from: { name: 'BT TIMAH RD' }, to: { name: 'Destination' } },
        ],
      },
    ],
  },
};

describe('decodePolyline', () => {
  it('decodes Google-encoded polylines', () => {
    // Canonical example from the polyline algorithm docs
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ]);
  });
});

describe('normalising OneMap responses', () => {
  it('turns a walk response into minutes, km and readable steps', () => {
    const route = normaliseDirectRoute(WALK_RESPONSE, 'walk', 'Fort Canning Park')!;
    expect(route).toMatchObject({ mode: 'walk', source: 'onemap', durationMinutes: 26, distanceKm: 2.2 });
    expect(route.steps.map((s) => s.instruction)).toEqual([
      'Head along Bayfront Avenue',
      'Turn left onto Stamford Road',
      'Arrive at Fort Canning Park',
    ]);
    expect(route.steps[0]).toMatchObject({ kind: 'walk', distanceMeters: 400, durationMinutes: 5 });
    expect(route.path.length).toBeGreaterThan(0);
  });

  it('turns a transit itinerary into legs with lines, fare and transfers', () => {
    const route = normaliseTransitRoute(PT_RESPONSE, 'Fort Canning Park')!;
    expect(route).toMatchObject({ mode: 'pt', durationMinutes: 22, distanceKm: 4.2, fareSgd: '1.47', transfers: 0 });
    expect(route.steps.map((s) => [s.kind, s.instruction])).toEqual([
      ['walk', 'Walk to Bayfront MRT Station'],
      ['rail', 'Take the Downtown Line from Bayfront MRT Station to Fort Canning MRT Station (3 stops)'],
      ['bus', 'Take bus 7 from Opp Fort Canning to Bt Timah Rd (1 stop)'],
      ['walk', 'Walk to Fort Canning Park'],
    ]);
    expect(route.steps[1].line).toBe('Downtown Line');
    // Codes needed for live LTA data: the station on this line, its LTA line code, the 5-digit bus stop
    expect(route.steps[1]).toMatchObject({ stationCode: 'DT16', lineCode: 'DTL' });
    expect(route.steps[2]).toMatchObject({ stopCode: '04167', line: '7' });
  });

  it('returns null for responses without a route', () => {
    expect(normaliseDirectRoute({ error: 'No route' }, 'walk', 'x')).toBeNull();
    expect(normaliseTransitRoute({ plan: { itineraries: [] } }, 'x')).toBeNull();
  });
});

describe('parseRouteQuery', () => {
  it('accepts Singapore coordinates and a known mode', () => {
    expect(parseRouteQuery({ start: '1.2834,103.8598', end: '1.2955,103.8457', mode: 'pt' })).toMatchObject({
      start: MARINA_BAY,
      end: FORT_CANNING,
      mode: 'pt',
    });
  });

  it('rejects places outside Singapore and unknown modes', () => {
    expect(() => parseRouteQuery({ start: '51.5,-0.12', end: '1.2955,103.8457', mode: 'walk' })).toThrow(/Singapore/);
    expect(() => parseRouteQuery({ start: '1.2834,103.8598', end: '1.2955,103.8457', mode: 'teleport' })).toThrow(/mode/);
  });
});

describe('estimateRoute', () => {
  it('uses real distance between the points, not a fixed number', () => {
    const near = estimateRoute(MARINA_BAY, FORT_CANNING, 'walk', 'n');
    const far = estimateRoute({ lat: 1.3572, lng: 103.9872 }, FORT_CANNING, 'walk', 'n'); // Changi T3
    expect(haversineKm(MARINA_BAY, FORT_CANNING)).toBeCloseTo(2.06, 1);
    expect(far.distanceKm).toBeGreaterThan(near.distanceKm * 5);
    expect(near).toMatchObject({ source: 'estimate', steps: [], path: [] });
  });
});

describe('OneMap tokens', () => {
  beforeEach(() => resetOneMapTokenCache());
  afterEach(() => vi.unstubAllGlobals());

  it('reads the expiry from the token and reports status without exposing the token', () => {
    const token = validToken();
    expect(getTokenExpiry(token)).toBeGreaterThan(Date.now());
    const health = describeOneMapRouting({ ONEMAP_TOKEN: token });
    expect(health.status).toBe('configured');
    expect(JSON.stringify(health)).not.toContain(token);
    expect(describeOneMapRouting({ ONEMAP_TOKEN: expiredToken() }).status).toBe('expired');
    expect(describeOneMapRouting({}).status).toBe('not_configured');
  });

  it('renews an expired token from email and password when they are configured', async () => {
    const fresh = validToken();
    const fetchMock = vi.fn().mockResolvedValue(json({ access_token: fresh }));
    vi.stubGlobal('fetch', fetchMock);
    const token = await getOneMapToken({ ONEMAP_TOKEN: expiredToken(), ONEMAP_EMAIL: 'a@b.sg', ONEMAP_PASSWORD: 'longpassword' });
    expect(token).toBe(fresh);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null for an expired token with no way to renew it', async () => {
    expect(await getOneMapToken({ ONEMAP_TOKEN: expiredToken() })).toBeNull();
  });
});

describe('getRoute', () => {
  beforeEach(() => resetOneMapTokenCache());
  afterEach(() => vi.unstubAllGlobals());

  const request = (mode: 'walk' | 'pt' = 'walk', end = FORT_CANNING) => ({ start: MARINA_BAY, end, mode, endName: 'Fort Canning Park' });

  it('falls back to a labelled estimate when routing is not configured', async () => {
    const route = await getRoute(request(), {});
    expect(route).toMatchObject({ source: 'estimate', note: "Live routing isn't set up yet." });
  });

  it('falls back with a clear note when the token has expired', async () => {
    const route = await getRoute(request(), { ONEMAP_TOKEN: expiredToken() });
    expect(route.note).toMatch(/expired/);
  });

  it('returns the OneMap route, switching to a Bearer header if the bare token is refused', async () => {
    const token = validToken();
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) =>
      (init.headers as Record<string, string>).Authorization === `Bearer ${token}` ? json(WALK_RESPONSE) : json({ message: 'Unauthorized' }, 401)
    );
    vi.stubGlobal('fetch', fetchMock);
    const route = await getRoute(request('walk', { lat: 1.3, lng: 103.85 }), { ONEMAP_TOKEN: token });
    expect(route.source).toBe('onemap');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sends transit date, time and mode, and returns a transit route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(PT_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);
    const route = await getRoute({ ...request('pt', { lat: 1.31, lng: 103.86 }), date: '2026-10-10', time: '09:30' }, { ONEMAP_TOKEN: validToken() });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ routeType: 'pt', date: '10-10-2026', time: '09:30:00', mode: 'TRANSIT' });
    expect(route).toMatchObject({ source: 'onemap', fareSgd: '1.47' });
  });

  it('falls back when OneMap rejects the token or errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Unauthorized' }, 401)));
    expect((await getRoute(request('walk', { lat: 1.32, lng: 103.85 }), { ONEMAP_TOKEN: validToken() })).note).toMatch(/rejected/);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'boom' }, 500)));
    expect((await getRoute(request('walk', { lat: 1.33, lng: 103.85 }), { ONEMAP_TOKEN: validToken() })).source).toBe('estimate');
  });
});
