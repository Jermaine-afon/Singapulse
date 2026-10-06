import { describe, expect, it } from 'vitest';
import { classifyForecast, parseRainForecast } from './rainForecastService';

describe('classifyForecast', () => {
  it('groups NEA forecast phrases', () => {
    expect(classifyForecast('Heavy Thundery Showers with Gusty Winds')).toBe('thunder');
    expect(classifyForecast('Passing Showers')).toBe('rain');
    expect(classifyForecast('Light Rain')).toBe('rain');
    expect(classifyForecast('Partly Cloudy (Day)')).toBe('cloudy');
    expect(classifyForecast('Hazy')).toBe('haze');
    expect(classifyForecast('Fair & Warm')).toBe('fair-day');
    expect(classifyForecast('Fair (Night)')).toBe('fair-night');
  });
});

describe('parseRainForecast', () => {
  it('joins area positions with their forecasts', () => {
    const parsed = parseRainForecast({
      code: 0,
      data: {
        area_metadata: [
          { name: 'Bedok', label_location: { latitude: 1.321, longitude: 103.924 } },
          { name: 'Jurong West', label_location: { latitude: 1.34, longitude: 103.705 } },
          { name: 'No Forecast Area', label_location: { latitude: 1.3, longitude: 103.8 } },
        ],
        items: [
          {
            valid_period: { text: '12.30 pm to 2.30 pm' },
            forecasts: [
              { area: 'Bedok', forecast: 'Thundery Showers' },
              { area: 'Jurong West', forecast: 'Fair & Warm' },
            ],
          },
        ],
      },
    });
    expect(parsed).toEqual({
      validText: '12.30 pm to 2.30 pm',
      areas: [
        { area: 'Bedok', lat: 1.321, lng: 103.924, forecast: 'Thundery Showers', kind: 'thunder' },
        { area: 'Jurong West', lat: 1.34, lng: 103.705, forecast: 'Fair & Warm', kind: 'fair-day' },
      ],
    });
  });

  it('returns null for an error or empty response', () => {
    expect(parseRainForecast({ code: 24, data: null })).toBeNull();
    expect(parseRainForecast({ data: { area_metadata: [], items: [{ forecasts: [] }] } })).toBeNull();
  });
});
