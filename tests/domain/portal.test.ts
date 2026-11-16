// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  checkPortalActivation,
  PORTAL_AUTH,
  PORTAL_ERROR_MESSAGES,
  PORTAL_PROGRESS_STAGES,
  toDocCategory,
  groupPortalDocuments,
  DOC_CATEGORY_ORDER,
} from '../../src/domain/portal';

describe('checkPortalActivation', () => {
  it('is active when all conditions met', () => {
    expect(checkPortalActivation(true, 1, '+919876543210', 'ACTIVE').isActive).toBe(true);
  });

  it('is inactive when portal disabled', () => {
    const r = checkPortalActivation(false, 1, '+919876543210', 'ACTIVE');
    expect(r.isActive).toBe(false);
    expect(r.reason).toMatch(/disabled/i);
  });

  it('is inactive with zero client-visible content', () => {
    const r = checkPortalActivation(true, 0, '+919876543210', 'ACTIVE');
    expect(r.isActive).toBe(false);
    expect(r.reason).toMatch(/client-visible/i);
  });

  it('is inactive without a phone', () => {
    const r = checkPortalActivation(true, 1, null, 'ACTIVE');
    expect(r.isActive).toBe(false);
    expect(r.reason).toMatch(/phone/i);
  });

  it.each(['CLOSED', 'CANCELLED'] as const)('is inactive when %s', (status) => {
    const r = checkPortalActivation(true, 1, '+919876543210', status);
    expect(r.isActive).toBe(false);
    expect(r.reason).toMatch(/closed/i);
  });
});

describe('generic error messages', () => {
  it('never reveals which factor failed', () => {
    const allMessages = Object.values(PORTAL_ERROR_MESSAGES).join(' ').toLowerCase();
    for (const leak of ['not found', 'wrong phone', 'wrong case', 'does not exist', 'locked out']) {
      expect(allMessages).not.toContain(leak);
    }
  });

  it('lockout message does not reveal attempt count', () => {
    expect(PORTAL_ERROR_MESSAGES.ACCOUNT_LOCKED.toLowerCase()).not.toMatch(/\d+ attempt/);
  });
});

describe('portal auth constants', () => {
  it('enforces 5-attempt / 30-minute lockout', () => {
    expect(PORTAL_AUTH.MAX_ATTEMPTS).toBe(5);
    expect(PORTAL_AUTH.LOCKOUT_MINUTES).toBe(30);
  });

  it('session is 15 minutes', () => {
    expect(PORTAL_AUTH.SESSION_MINUTES).toBe(15);
  });
});

describe('document categories', () => {
  it('maps the 3 known categories to themselves', () => {
    expect(toDocCategory('ACTION_REQUIRED')).toBe('ACTION_REQUIRED');
    expect(toDocCategory('AWAITING_REVIEW')).toBe('AWAITING_REVIEW');
    expect(toDocCategory('APPROVED')).toBe('APPROVED');
  });

  it('falls back any unknown/future/empty status to ACTION_REQUIRED (never crashes)', () => {
    expect(toDocCategory('SOMETHING_NEW')).toBe('ACTION_REQUIRED');
    expect(toDocCategory('')).toBe('ACTION_REQUIRED');
    expect(toDocCategory('RECEIVED')).toBe('ACTION_REQUIRED'); // old vocabulary no longer a category
  });

  it('groups attention-first and preserves every document (counts sum to length)', () => {
    const docs = [
      { id: '1', status: 'APPROVED' },
      { id: '2', status: 'ACTION_REQUIRED' },
      { id: '3', status: 'AWAITING_REVIEW' },
      { id: '4', status: 'WEIRD' }, // → ACTION_REQUIRED
      { id: '5', status: 'APPROVED' },
    ];
    const groups = groupPortalDocuments(docs);
    expect(groups.map(g => g.category)).toEqual(DOC_CATEGORY_ORDER);
    const total = groups.reduce((n, g) => n + g.docs.length, 0);
    expect(total).toBe(docs.length); // no document silently hidden
    expect(groups[0].docs.map(d => d.id)).toEqual(['2', '4']); // action-required incl. unknown fallback
    expect(groups[2].docs.map(d => d.id)).toEqual(['1', '5']);
  });

  it('returns all three groups even when some are empty', () => {
    const groups = groupPortalDocuments([{ id: '1', status: 'APPROVED' }]);
    expect(groups).toHaveLength(3);
    expect(groups.find(g => g.category === 'ACTION_REQUIRED')!.docs).toHaveLength(0);
  });
});

describe('progress stages', () => {
  it('has exactly 5 stages', () => {
    expect(PORTAL_PROGRESS_STAGES).toHaveLength(5);
  });

  it('starts with RECEIVED and ends with COMPLETED', () => {
    expect(PORTAL_PROGRESS_STAGES[0].key).toBe('RECEIVED');
    expect(PORTAL_PROGRESS_STAGES[4].key).toBe('COMPLETED');
  });
});
