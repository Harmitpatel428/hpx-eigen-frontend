import type { PortalAuthResult, PortalCaseView } from '../types';
import { isValidCaseId, phoneLast4, safeCompare } from '../domain/caseId';
import { PORTAL_AUTH, PORTAL_ERROR_MESSAGES } from '../domain/portal';

// ── Service contract ─────────────────────────────────────────────────────────

export interface IPortalService {
  authenticate(caseId: string, phoneDigits: string, idempotencyKey: string): Promise<PortalAuthResult>;
  getCaseView(sessionToken: string): Promise<PortalCaseView>;
  requestContactChange(sessionToken: string, newPhone: string, reason: string): Promise<void>;
}

// ── Mock adapter ─────────────────────────────────────────────────────────────

const MOCK_CASES: Record<string, { phone: string; caseView: PortalCaseView }> = {
  'HPX-7K3M-92QD': {
    phone: '9876543210',
    caseView: {
      caseId: 'HPX-7K3M-92QD',
      clientName: 'Arun Sharma',
      status: 'ACTIVE',
      portalActivatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      progressStages: [
        { key: 'RECEIVED',   label: 'Application received',     completedAt: new Date(Date.now() - 5 * 86400000).toISOString(), isCurrent: false },
        { key: 'IN_REVIEW',  label: 'Documents under review',   completedAt: new Date(Date.now() - 3 * 86400000).toISOString(), isCurrent: false },
        { key: 'VERIFIED',   label: 'Verification complete',    completedAt: null, isCurrent: true },
        { key: 'PROCESSING', label: 'Processing',               completedAt: null, isCurrent: false },
        { key: 'COMPLETED',  label: 'Case completed',           completedAt: null, isCurrent: false },
      ],
      documents: [
        { id: 'd1', name: 'KYC Form',         status: 'APPROVED',  clientVisible: true,  receivedAt: new Date(Date.now() - 86400000 * 4).toISOString() },
        { id: 'd2', name: 'Income Statement', status: 'RECEIVED',  clientVisible: true,  receivedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: 'd3', name: 'Internal Check',   status: 'APPROVED',  clientVisible: false, receivedAt: null },
        { id: 'd4', name: 'Address Proof',    status: 'REQUESTED', clientVisible: true,  receivedAt: null },
      ],
      notes: [
        { id: 'n1', content: 'Your application has been received and is under review. Our team will contact you if additional documents are required.', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: 'n2', content: 'Verification of your KYC documents is complete. Processing has begun.', createdAt: new Date(Date.now() - 86400000).toISOString() },
      ],
    },
  },
};

const attemptLog = new Map<string, { count: number; lockedUntil: number | null }>();

class MockPortalService implements IPortalService {
  async authenticate(caseId: string, phoneDigits: string, _idempotencyKey: string): Promise<PortalAuthResult> {
    await delay(600);

    if (!isValidCaseId(caseId)) {
      return { success: false, remainingAttempts: PORTAL_AUTH.MAX_ATTEMPTS };
    }

    const key = caseId.toUpperCase();
    const log = attemptLog.get(key) ?? { count: 0, lockedUntil: null };

    if (log.lockedUntil && Date.now() < log.lockedUntil) {
      return { success: false, lockedUntil: new Date(log.lockedUntil).toISOString() };
    }

    const mockCase = MOCK_CASES[key];
    const isValid = mockCase && safeCompare(phoneLast4(mockCase.phone), phoneDigits.trim());

    if (!isValid) {
      const newCount = log.count + 1;
      const lockedUntil = newCount >= PORTAL_AUTH.MAX_ATTEMPTS
        ? Date.now() + PORTAL_AUTH.LOCKOUT_MINUTES * 60 * 1000
        : null;
      attemptLog.set(key, { count: newCount, lockedUntil });
      return {
        success: false,
        remainingAttempts: Math.max(0, PORTAL_AUTH.MAX_ATTEMPTS - newCount),
        lockedUntil: lockedUntil ? new Date(lockedUntil).toISOString() : undefined,
      };
    }

    attemptLog.delete(key);
    const expiresAt = new Date(Date.now() + PORTAL_AUTH.SESSION_MINUTES * 60 * 1000).toISOString();
    return { success: true, sessionToken: `mock-token-${key}`, expiresAt };
  }

  async getCaseView(sessionToken: string): Promise<PortalCaseView> {
    await delay(400);
    const caseId = sessionToken.replace('mock-token-', '');
    const entry = MOCK_CASES[caseId];
    if (!entry) throw new Error(PORTAL_ERROR_MESSAGES.CASE_UNAVAILABLE);
    return entry.caseView;
  }

  async requestContactChange(_sessionToken: string, _newPhone: string, _reason: string): Promise<void> {
    await delay(500);
    // Mock: always succeeds — triggers manager approval flow in real impl
  }
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ── API adapter stub ──────────────────────────────────────────────────────────

class ApiPortalService implements IPortalService {
  async authenticate(caseId: string, phoneDigits: string, idempotencyKey: string): Promise<PortalAuthResult> {
    const { api } = await import('./api');
    const res = await api.post('/api/v1/portal/auth', { caseId, phoneDigits }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return (res.data as any).data;
  }

  async getCaseView(sessionToken: string): Promise<PortalCaseView> {
    const { api } = await import('./api');
    const res = await api.get('/api/v1/portal/case', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    return (res.data as any).data;
  }

  async requestContactChange(sessionToken: string, newPhone: string, reason: string): Promise<void> {
    const { api } = await import('./api');
    await api.post('/api/v1/portal/contact-change', { newPhone, reason }, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
  }
}

export const portalService: IPortalService =
  import.meta.env.VITE_USE_MOCK_PORTAL === 'true' || import.meta.env.DEV
    ? new MockPortalService()
    : new ApiPortalService();
