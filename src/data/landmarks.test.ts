import { describe, expect, it } from 'vitest';
import { SINGAPORE_LANDMARKS } from './landmarks';

describe('landmark photos', () => {
  it('uses only credited Wikimedia Commons photos, or none', () => {
    for (const lm of SINGAPORE_LANDMARKS) {
      if (!lm.imageUrl) {
        expect(lm.imageCredit).toBeUndefined();
        continue;
      }
      expect(lm.imageUrl).toMatch(/^https:\/\/(upload|thumb)\.wikimedia\.org\//);
      expect(lm.imageCredit?.author).toBeTruthy();
      expect(lm.imageCredit?.license).toBeTruthy();
      expect(lm.imageCredit?.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });

  it('never reuses one photo across many places', () => {
    const uses = new Map<string, number>();
    for (const lm of SINGAPORE_LANDMARKS) if (lm.imageUrl) uses.set(lm.imageUrl, (uses.get(lm.imageUrl) ?? 0) + 1);
    // The same article photo can legitimately serve a place and its sub-attraction (e.g. a park and its trail)
    expect(Math.max(0, ...uses.values())).toBeLessThanOrEqual(3);
  });
});
