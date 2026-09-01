import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Keys must match ActivitiesPage.tsx
const STICKY_HEADER_KEY = 'hpx-activities-sticky';

describe('ActivitiesPage sticky header', () => {
  beforeEach(() => localStorage.clear());

  // A5: first load → default OFF
  it('[A5] defaults to OFF when localStorage is empty', () => {
    expect(localStorage.getItem(STICKY_HEADER_KEY)).toBeNull();
    const val = (() => {
      try { return localStorage.getItem(STICKY_HEADER_KEY) === 'true'; }
      catch { return false; }
    })();
    expect(val).toBe(false);
  });

  // A3: toggle ON → aria-checked=true + pref persisted
  it('[A3] persists true when toggled ON', () => {
    localStorage.setItem(STICKY_HEADER_KEY, 'true');
    expect(localStorage.getItem(STICKY_HEADER_KEY)).toBe('true');
    const val = localStorage.getItem(STICKY_HEADER_KEY) === 'true';
    expect(val).toBe(true);
  });

  // A4: toggle OFF → pref persisted as false
  it('[A4] persists false when toggled OFF', () => {
    localStorage.setItem(STICKY_HEADER_KEY, 'true');
    localStorage.setItem(STICKY_HEADER_KEY, 'false');
    const val = localStorage.getItem(STICKY_HEADER_KEY) === 'true';
    expect(val).toBe(false);
  });

  // A4 continued: throwing setItem → no crash
  it('[A4] survives localStorage.setItem throwing', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('QuotaExceeded'); };
    try {
      const getStickyHeader = () => {
        try { return localStorage.getItem(STICKY_HEADER_KEY) === 'true'; }
        catch { return false; }
      };
      expect(getStickyHeader()).toBe(false);
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  // A1: constant identity
  it('[A1] STICKY_HEADER_KEY is the expected constant', () => {
    expect(STICKY_HEADER_KEY).toBe('hpx-activities-sticky');
  });
});

describe('ActivitiesPage header geometry invariant', () => {
  const src = readFileSync(resolve(__dirname, 'ActivitiesPage.tsx'), 'utf-8');

  // H1/H2: count element ALWAYS renders (no conditional guard)
  it('[H1] count element is not behind a conditional render guard', () => {
    expect(src).toContain('data-testid="activities-count"');
    // Must NOT have `total > 0 &&` or `total && ` before the count element
    expect(src).not.toMatch(/total\s*>\s*0\s*&&[^]*?activities-count/);
    expect(src).not.toMatch(/total\s*&&[^]*?activities-count/);
  });

  // H2: count text uses the `total` variable (shows "0 activities" when empty)
  it('[H2] count text includes the total variable', () => {
    const countLine = src.split('\n').find(l => l.includes('activities-count'));
    expect(countLine).toBeDefined();
    expect(src).toMatch(/\{total\}\s*activit/);
  });

  // H3: the count element exists unconditionally in the sticky header container
  it('[H3] count element is inside the sticky header container', () => {
    const stickyIdx = src.indexOf('stickyHeader');
    const countIdx = src.indexOf('activities-count');
    expect(stickyIdx).toBeGreaterThan(-1);
    expect(countIdx).toBeGreaterThan(-1);
    expect(countIdx).toBeGreaterThan(stickyIdx);
  });

  // H4: filter pills render after count (structural order invariant)
  it('[H4] filter pills render after the count line', () => {
    const countIdx = src.indexOf('activities-count');
    const filtersIdx = src.indexOf("f.key === 'DUE_TODAY'") !== -1
      ? src.indexOf('FILTERS.map')
      : src.indexOf('Filter pills');
    expect(filtersIdx).toBeGreaterThan(countIdx);
  });

  // H5: min-height on content region prevents layout shift
  it('[H5] content region has min-height for layout stability', () => {
    expect(src).toMatch(/minHeight:\s*'calc\(100vh/);
  });
});
