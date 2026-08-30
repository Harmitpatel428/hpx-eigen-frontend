// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  checkPortalActivation,
  PORTAL_AUTH,
  PORTAL_ERROR_MESSAGES,
  PORTAL_PROGRESS_STAGES,
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

describe('progress stages', () => {
  it('has exactly 5 stages', () => {
    expect(PORTAL_PROGRESS_STAGES).toHaveLength(5);
  });

  it('starts with RECEIVED and ends with COMPLETED', () => {
    expect(PORTAL_PROGRESS_STAGES[0].key).toBe('RECEIVED');
    expect(PORTAL_PROGRESS_STAGES[4].key).toBe('COMPLETED');
  });
});
