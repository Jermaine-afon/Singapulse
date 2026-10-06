import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkLta,
  getLiveTransit,
  normaliseBusService,
  normaliseCrowd,
  normaliseTrainAlerts,
  parseLiveQuery,
  resetLtaCache,
} from './lta';

const json = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) }) as Response;

const NOW = Date.parse('2026-10-06T12:00:00+08:00');
const at = (minutes: number) => new Date(NOW + minutes * 60_000).toISOString();

const BUS_STOP_RESPONSE = {
  BusStopCode: '04167',
  Services: [
    {
      ServiceNo: '7',
      Operator: 'SBST',
      NextBus: { EstimatedArrival: at(3), Monitored: 1, Load: 'SEA', Feature: 'WAB', Type: 'DD' },
      NextBus2: { EstimatedArrival: at(11), Monitored: 1, Load: 'SDA', Feature: '', Type: 'SD' },
      NextBus3: { EstimatedArrival: '', Monitored: 0, Load: '', Feature: '', Type: '' },
    },
    { ServiceNo: '14', NextBus: { EstimatedArrival: at(5), Monitored: 0, Load: 'LSD' } },
  ],
};

const ALERTS_DISRUPTED = {
  value: {
    Status: 2,
    AffectedSegments: [
      { Line: 'EWL', Direction: 'Pasir Ris', Stations: 'EW13,EW14,EW15', FreePublicBus: 'EW13,EW14', FreeMRTShuttle: 'EW13' },
    ],
    Message: [{ Content: 'EWL: Train service delayed between City Hall and Tanjong Pagar.', CreatedDate: '2026-10-06 11:50:00' }],
  },
};

describe('normalising DataMall feeds', () => {
  it('turns bus arrivals into minutes, load and accessibility, skipping empty slots', () => {
    expect(normaliseBusService(BUS_STOP_RESPONSE.Services[0], NOW)).toEqual([
      { minutes: 3, load: 'seats', wheelchair: true, doubleDeck: true, live: true },
      { minutes: 11, load: 'standing', wheelchair: false, doubleDeck: false, live: true },
    ]);
    expect(normaliseBusService({ NextBus: { EstimatedArrival: at(-1), Monitored: 1 } }, NOW)[0].minutes).toBe(0);
  });

  it('reads disruptions only when Status is 2, with line names and free bus info', () => {
    expect(normaliseTrainAlerts({ value: { Status: 1, AffectedSegments: [], Message: [] } })).toEqual([]);
    expect(normaliseTrainAlerts(ALERTS_DISRUPTED)).toEqual([
      {
        line: 'EWL',
        lineName: 'East-West Line',
        direction: 'Pasir Ris',
        stations: ['EW13', 'EW14', 'EW15'],
        freeBus: 'EW13,EW14',
        freeShuttle: 'EW13',
        message: 'EWL: Train service delayed between City Hall and Tanjong Pagar.',
      },
    ]);
  });

  it('maps crowd codes to levels and ignores unknown ones', () => {
    expect(
      normaliseCrowd({ value: [{ Station: 'EW13', CrowdLevel: 'h' }, { Station: 'EW14', CrowdLevel: 'l' }, { Station: 'EW15', CrowdLevel: 'NA' }] })
    ).toEqual({ EW13: 'high', EW14: 'low' });
  });
});

describe('parseLiveQuery', () => {
  it('keeps only well-formed stop codes, services, station codes and known lines', () => {
    expect(
      parseLiveQuery({
        buses: '04167:7,123:7,04168:<script>',
        stations: 'EW13:EWL,EW13:XYZ,bad:EWL',
        lines: 'ewl,NEL,FAKE',
      })
    ).toEqual({
      buses: [{ stopCode: '04167', serviceNo: '7' }],
      stations: [{ stationCode: 'EW13', lineCode: 'EWL' }],
      lines: ['EWL', 'NEL'],
    });
  });
});

describe('getLiveTransit', () => {
  beforeEach(() => resetLtaCache());
  afterEach(() => vi.unstubAllGlobals());

  const request = {
    buses: [{ stopCode: '04167', serviceNo: '7' }],
    stations: [{ stationCode: 'EW13', lineCode: 'EWL' }],
    lines: ['EWL', 'NEL'],
  };

  it('is unavailable without an AccountKey and makes no calls', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await getLiveTransit(request, undefined)).toEqual({ available: false, busArrivals: {}, crowd: {}, alerts: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('combines arrivals, crowd and only the alerts for lines on the route, sending the AccountKey', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.includes('/v3/BusArrival?BusStopCode=04167')) return json(BUS_STOP_RESPONSE);
      if (url.includes('/PCDRealTime?TrainLine=EWL')) return json({ value: [{ Station: 'EW13', CrowdLevel: 'm' }] });
      if (url.includes('/TrainServiceAlerts')) return json(ALERTS_DISRUPTED);
      return json({}, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    const live = await getLiveTransit(request, 'secret-key');
    expect(live.available).toBe(true);
    expect(live.busArrivals['04167:7']).toHaveLength(2);
    expect(live.crowd).toEqual({ EW13: 'moderate' });
    expect(live.alerts.map((a) => a.line)).toEqual(['EWL']);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ AccountKey: 'secret-key' });
  });

  it('keeps working feeds when another feed fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => (url.includes('BusArrival') ? json(BUS_STOP_RESPONSE) : json({ error: 'down' }, 500)))
    );
    const live = await getLiveTransit(request, 'secret-key');
    expect(live.available).toBe(true);
    expect(live.busArrivals['04167:7']).toBeDefined();
    expect(live.alerts).toEqual([]);
  });

  it('reports unavailable when every feed fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 503)));
    expect((await getLiveTransit(request, 'secret-key')).available).toBe(false);
  });
});

describe('checkLta', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports configuration and key problems without exposing the key', async () => {
    expect((await checkLta(undefined)).status).toBe('not_configured');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 401)));
    const bad = await checkLta('secret-key');
    expect(bad.status).toBe('invalid_key');
    expect(JSON.stringify(bad)).not.toContain('secret-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ value: { Status: 1 } })));
    expect((await checkLta('secret-key')).status).toBe('connected');
  });
});
