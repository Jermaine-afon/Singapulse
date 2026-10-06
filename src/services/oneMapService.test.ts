import { describe, expect, it } from 'vitest';
import { getOneMapResultName, toDisplayCase, type OneMapSearchResult } from './oneMapService';

const result = (overrides: Partial<OneMapSearchResult>): OneMapSearchResult => ({
  SEARCHVAL: '',
  BLK_NO: '',
  ROAD_NAME: '',
  BUILDING: 'NIL',
  ADDRESS: '',
  POSTAL: '',
  LATITUDE: '1.3',
  LONGITUDE: '103.8',
  ...overrides,
});

describe('toDisplayCase', () => {
  it('title-cases OneMap names but keeps acronyms and station codes', () => {
    expect(toDisplayCase('TANJONG PAGAR MRT STATION (EW15)')).toBe('Tanjong Pagar MRT Station (EW15)');
    expect(toDisplayCase('RAFFLES HOTEL')).toBe('Raffles Hotel');
    expect(toDisplayCase('123 ANG MO KIO AVENUE 6 SINGAPORE 560123')).toBe('123 Ang Mo Kio Avenue 6 Singapore 560123');
    expect(toDisplayCase('BLK 2A HDB HUB')).toBe('Blk 2A HDB Hub');
  });
});

describe('getOneMapResultName', () => {
  it('prefers the building name and falls back to the search value when OneMap says NIL', () => {
    expect(getOneMapResultName(result({ BUILDING: 'RAFFLES HOTEL', SEARCHVAL: '1 BEACH ROAD' }))).toBe('RAFFLES HOTEL');
    expect(getOneMapResultName(result({ BUILDING: 'NIL', SEARCHVAL: '123 ANG MO KIO AVENUE 6' }))).toBe('123 ANG MO KIO AVENUE 6');
  });
});
