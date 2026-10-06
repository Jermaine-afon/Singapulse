import { afterEach, describe, expect, it, vi } from 'vitest';
import { enforceSchedule, generatePlan, normaliseResponse, parseRequest, PlannerError } from './planner';
import { guardPlanRequest, resetRateLimit } from './requestGuard';
import type { PlannerPreferences, PlanStop } from '../src/types/planner';

const prefs = (overrides: Partial<PlannerPreferences> = {}): PlannerPreferences => ({
  date: '2026-10-10',
  startTime: '09:00',
  endTime: '13:00',
  interests: [],
  pace: 'balanced',
  startPoint: 'Chinatown MRT (Exit A)',
  mustVisitIds: [],
  weatherSummary: '',
  ...overrides,
});

const landmark = (time: string, landmarkId: string, durationMinutes = 60): PlanStop => ({
  time,
  durationMinutes,
  type: 'landmark',
  landmarkId,
  title: landmarkId,
  note: '',
});

const meal = (time: string, durationMinutes = 60): PlanStop => ({ time, durationMinutes, type: 'meal', title: 'Lunch', note: '' });

const validBody = (overrides: Record<string, unknown> = {}) => ({
  preferences: prefs(),
  messages: [{ role: 'user', content: 'Plan my day' }],
  currentPlan: null,
  ...overrides,
});

describe('enforceSchedule', () => {
  it('drops stops outside the time window', () => {
    const { stops, warnings } = enforceSchedule(
      [landmark('08:00', 'fort-canning-tunnel'), landmark('10:00', 'tiong-bahru-art-deco'), meal('15:00')],
      prefs()
    );
    expect(stops.map((s) => s.time)).toEqual(['10:00']);
    expect(warnings[0]).toMatch(/Removed 2 stops outside your 09:00–13:00 window/);
  });

  it('removes repeated landmarks', () => {
    const { stops, warnings } = enforceSchedule(
      [landmark('09:00', 'fort-canning-tunnel'), landmark('11:00', 'fort-canning-tunnel')],
      prefs()
    );
    expect(stops).toHaveLength(1);
    expect(warnings).toContain('Removed 1 repeated landmark.');
  });

  it('shortens a stop that overlaps the next one and drops stops in the same slot', () => {
    const { stops, warnings } = enforceSchedule(
      [landmark('09:00', 'fort-canning-tunnel', 120), meal('10:00'), meal('10:05')],
      prefs()
    );
    expect(stops.map((s) => [s.time, s.durationMinutes])).toEqual([
      ['09:00', 60],
      ['10:00', 60],
    ]);
    expect(warnings).toContain('Removed 1 stop that clashed with an earlier stop.');
  });

  it('makes the last stop end by the end of the window', () => {
    const { stops } = enforceSchedule([meal('12:30', 90)], prefs());
    expect(stops[0].durationMinutes).toBe(30);
  });

  it('sorts stops chronologically without mutating the input', () => {
    const input = [meal('11:00', 30), landmark('09:00', 'fort-canning-tunnel', 300)];
    const { stops } = enforceSchedule(input, prefs());
    expect(stops.map((s) => s.time)).toEqual(['09:00', '11:00']);
    expect(input[1].durationMinutes).toBe(300);
  });

  it('warns about must-visit places that were left out', () => {
    const { warnings } = enforceSchedule(
      [landmark('09:00', 'fort-canning-tunnel')],
      prefs({ mustVisitIds: ['fort-canning-tunnel', 'tiong-bahru-art-deco'] })
    );
    expect(warnings.some((w) => w.startsWith("Couldn't fit this saved place: Tiong Bahru"))).toBe(true);
  });
});

describe('normaliseResponse', () => {
  it('drops made-up landmarks, fixes names from the catalog and reports warnings', () => {
    const content = JSON.stringify({
      reply: 'ok',
      plan: {
        title: 'Day',
        summary: '',
        stops: [
          { time: '09:00', durationMinutes: 45, type: 'landmark', landmarkId: 'fort-canning-tunnel', title: 'WRONG', note: '' },
          { time: '10:00', durationMinutes: 45, type: 'landmark', landmarkId: 'not-a-real-place', title: 'Fake', note: '' },
        ],
      },
    });
    const res = normaliseResponse(content, prefs());
    expect(res.plan.stops).toHaveLength(1);
    expect(res.plan.stops[0].title).toBe('Fort Canning Tree Tunnel & Spiral Staircase');
    expect(res.warnings[0]).toMatch(/1 suggested stop that didn't match/);
  });

  it('rejects unreadable or empty plans', () => {
    expect(() => normaliseResponse('not json', prefs())).toThrow(PlannerError);
    expect(() => normaliseResponse(JSON.stringify({ plan: { stops: [meal('20:00')] } }), prefs())).toThrow(/usable stops/);
  });
});

describe('parseRequest', () => {
  it('rejects an end time before the start time', () => {
    expect(() => parseRequest(validBody({ preferences: prefs({ startTime: '14:00', endTime: '10:00' }) }))).toThrow(
      /End time must be after start time/
    );
  });

  it('rebuilds the client-supplied currentPlan instead of trusting it', () => {
    const hugeNote = 'x'.repeat(10_000);
    const req = parseRequest(
      validBody({
        currentPlan: {
          title: 'T'.repeat(500),
          summary: 'S',
          injected: 'ignore me',
          stops: [
            ...Array.from({ length: 30 }, (_, i) => meal(`${String(9 + (i % 4)).padStart(2, '0')}:00`)),
            { time: '09:00', durationMinutes: 60, type: 'landmark', landmarkId: 'made-up', title: 'x', note: hugeNote },
          ],
        },
      })
    );
    expect(req.currentPlan!.stops.length).toBeLessThanOrEqual(12);
    expect(req.currentPlan!.title.length).toBeLessThanOrEqual(120);
    expect(JSON.stringify(req.currentPlan)).not.toContain('ignore me');
    expect(JSON.stringify(req.currentPlan)).not.toContain(hugeNote);
  });

  it('drops unknown must-visit ids and requires the last message to be from the user', () => {
    const req = parseRequest(validBody({ preferences: prefs({ mustVisitIds: ['fort-canning-tunnel', 'nope'] }) }));
    expect(req.preferences.mustVisitIds).toEqual(['fort-canning-tunnel']);
    expect(() => parseRequest(validBody({ messages: [{ role: 'assistant', content: 'hi' }] }))).toThrow(PlannerError);
  });
});

describe('guardPlanRequest', () => {
  afterEach(() => resetRateLimit());

  it('rejects oversized bodies', () => {
    expect(() => guardPlanRequest({ ip: '1.1.1.1', bodyBytes: 40_000 })).toThrow(/too large/);
  });

  it('blocks requests from other websites but allows same-origin and server-to-server calls', () => {
    const base = { ip: '1.1.1.1', bodyBytes: 100, host: 'singapulse.vercel.app' };
    expect(() => guardPlanRequest({ ...base, origin: 'https://evil.example' })).toThrow(/other sites/);
    expect(() => guardPlanRequest({ ...base, origin: 'https://singapulse.vercel.app' })).not.toThrow();
    expect(() => guardPlanRequest({ ...base })).not.toThrow();
  });

  it('rate-limits each IP within the window and resets afterwards', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 20; i++) guardPlanRequest({ ip: '2.2.2.2', bodyBytes: 100 }, t0 + i);
    expect(() => guardPlanRequest({ ip: '2.2.2.2', bodyBytes: 100 }, t0 + 30)).toThrow(/Too many/);
    expect(() => guardPlanRequest({ ip: '3.3.3.3', bodyBytes: 100 }, t0 + 30)).not.toThrow();
    expect(() => guardPlanRequest({ ip: '2.2.2.2', bodyBytes: 100 }, t0 + 11 * 60_000)).not.toThrow();
  });
});

describe('generatePlan', () => {
  afterEach(() => vi.unstubAllGlobals());

  const deepSeekReply = (content: string) =>
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) });

  it('hides provider details from public error messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'bad key' }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(generatePlan(validBody(), { apiKey: 'k' })).rejects.toThrow('temporarily unavailable');
  });

  it('retries once on an empty response, then returns a validated plan', async () => {
    const good = JSON.stringify({ reply: 'hi', plan: { title: 'Day', summary: '', stops: [meal('12:00')] } });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '' } }] }) })
      .mockImplementation(deepSeekReply(good));
    vi.stubGlobal('fetch', fetchMock);

    const res = await generatePlan(validBody(), { apiKey: 'k' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.plan.stops).toHaveLength(1);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.messages[0].content).toContain('SECURITY');
  });
});
