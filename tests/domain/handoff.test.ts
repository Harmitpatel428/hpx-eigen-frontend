// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getHandoffAge,
  daysUntilAutoDrop,
  isReturnedState,
  canShowFixAndResend,
  HANDOFF_STATE_LABELS,
  HANDOFF_STATE_COLORS,
  HANDOFF_AGE_COLORS,
  HANDOFF_AGING_THRESHOLDS,
  RETURN_REASON_LABELS,
} from '../../src/domain/handoff';

describe('getHandoffAge', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns FRESH under 24h', () => {
    const now = new Date('2026-08-31T12:00:00Z');
    vi.setSystemTime(now);
    const handoffAt = new Date(now.getTime() - 10 * 3_600_000).toISOString();
    expect(getHandoffAge(handoffAt)).toBe('FRESH');
  });

  it('returns STALE between 24h and 48h', () => {
    const now = new Date('2026-08-31T12:00:00Z');
    vi.setSystemTime(now);
    const handoffAt = new Date(now.getTime() - 30 * 3_600_000).toISOString();
    expect(getHandoffAge(handoffAt)).toBe('STALE');
  });

  it('returns WARNING between 48h and 96h', () => {
    const now = new Date('2026-08-31T12:00:00Z');
    vi.setSystemTime(now);
    const handoffAt = new Date(now.getTime() - 72 * 3_600_000).toISOString();
    expect(getHandoffAge(handoffAt)).toBe('WARNING');
  });

  it('returns CRITICAL between 96h and 168h', () => {
    const now = new Date('2026-08-31T12:00:00Z');
    vi.setSystemTime(now);
    const handoffAt = new Date(now.getTime() - 120 * 3_600_000).toISOString();
    expect(getHandoffAge(handoffAt)).toBe('CRITICAL');
  });

  it('returns OVERDUE after 168h', () => {
    const now = new Date('2026-08-31T12:00:00Z');
    vi.setSystemTime(now);
    const handoffAt = new Date(now.getTime() - 200 * 3_600_000).toISOString();
    expect(getHandoffAge(handoffAt)).toBe('OVERDUE');
  });

  it('returns FRESH at exact boundary (0h)', () => {
    const now = new Date('2026-08-31T12:00:00Z');
    vi.setSystemTime(now);
    expect(getHandoffAge(now.toISOString())).toBe('FRESH');
  });
});

describe('daysUntilAutoDrop', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns null when autoDropAt is null', () => {
    expect(daysUntilAutoDrop(null)).toBeNull();
  });

  it('returns positive days when in future', () => {
    const now = new Date('2026-08-31T12:00:00Z');
    vi.setSystemTime(now);
    const drop = new Date(now.getTime() + 3 * 86_400_000).toISOString();
    expect(daysUntilAutoDrop(drop)).toBe(3);
  });

  it('returns 0 when in past', () => {
    const now = new Date('2026-08-31T12:00:00Z');
    vi.setSystemTime(now);
    const drop = new Date(now.getTime() - 86_400_000).toISOString();
    expect(daysUntilAutoDrop(drop)).toBe(0);
  });

  it('rounds up partial days', () => {
    const now = new Date('2026-08-31T12:00:00Z');
    vi.setSystemTime(now);
    const drop = new Date(now.getTime() + 1.5 * 86_400_000).toISOString();
    expect(daysUntilAutoDrop(drop)).toBe(2);
  });
});

describe('isReturnedState', () => {
  it('returns true for RETURNED', () => {
    expect(isReturnedState('RETURNED')).toBe(true);
  });
  it('returns true for MANAGER_REVIEW_REQUIRED', () => {
    expect(isReturnedState('MANAGER_REVIEW_REQUIRED')).toBe(true);
  });
  it('returns false for ACCEPTED', () => {
    expect(isReturnedState('ACCEPTED')).toBe(false);
  });
  it('returns false for HANDED_OFF', () => {
    expect(isReturnedState('HANDED_OFF')).toBe(false);
  });
  it('returns false for NONE', () => {
    expect(isReturnedState('NONE')).toBe(false);
  });
});

describe('canShowFixAndResend', () => {
  it('allows when RETURNED and no manager review', () => {
    expect(canShowFixAndResend('RETURNED', false)).toBe(true);
  });
  it('blocks when RETURNED but manager review required', () => {
    expect(canShowFixAndResend('RETURNED', true)).toBe(false);
  });
  it('allows when MANAGER_REVIEW_REQUIRED but managerReviewRequired is false', () => {
    expect(canShowFixAndResend('MANAGER_REVIEW_REQUIRED', false)).toBe(true);
  });
  it('blocks for ACCEPTED state', () => {
    expect(canShowFixAndResend('ACCEPTED', false)).toBe(false);
  });
  it('blocks for NONE state', () => {
    expect(canShowFixAndResend('NONE', false)).toBe(false);
  });
});

describe('label/color maps', () => {
  it('has labels for all 7 handoff states', () => {
    expect(Object.keys(HANDOFF_STATE_LABELS)).toHaveLength(7);
    expect(HANDOFF_STATE_LABELS.NONE).toBe('Not handed off');
    expect(HANDOFF_STATE_LABELS.AUTO_DROPPED).toBe('Auto-dropped');
  });

  it('has colors for all 7 handoff states', () => {
    expect(Object.keys(HANDOFF_STATE_COLORS)).toHaveLength(7);
  });

  it('has colors for all 5 age tiers', () => {
    expect(Object.keys(HANDOFF_AGE_COLORS)).toHaveLength(5);
  });

  it('has labels for all 6 return reasons', () => {
    expect(Object.keys(RETURN_REASON_LABELS)).toHaveLength(6);
    expect(RETURN_REASON_LABELS.WRONG_OR_MISSING_CONTACT).toBe('Wrong or missing contact');
    expect(RETURN_REASON_LABELS.OTHER).toBe('Other');
  });

  it('aging thresholds are in ascending order', () => {
    const { FRESH, STALE, WARNING, CRITICAL } = HANDOFF_AGING_THRESHOLDS;
    expect(FRESH).toBeLessThan(STALE);
    expect(STALE).toBeLessThan(WARNING);
    expect(WARNING).toBeLessThan(CRITICAL);
  });
});
