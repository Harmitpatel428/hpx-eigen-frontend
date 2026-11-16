// @vitest-environment node
// Contract tests for the real-API portal adapter. These pin the FE adapter to
// the backend envelope: POST /verify returns { success, data:{sessionToken,expiresAt} }
// and GET /case returns { data:{ caseNumber, documents:[...] } }.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';
import { ApiPortalService } from './portal.service';

vi.mock('./api', () => ({ api: { post: vi.fn(), get: vi.fn() } }));

const svc = new ApiPortalService();

beforeEach(() => {
  vi.mocked(api.post).mockReset();
  vi.mocked(api.get).mockReset();
});

describe('ApiPortalService.authenticate', () => {
  it('maps the backend success envelope to a success PortalAuthResult', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, data: { sessionToken: 'tok-123', expiresAt: '2026-01-01T00:00:00Z' } },
    } as any);

    const result = await svc.authenticate('HPX-7K3M-92QD', '3210', 'idem-1');

    expect(result.success).toBe(true);
    expect(result).toMatchObject({ sessionToken: 'tok-123', expiresAt: '2026-01-01T00:00:00Z' });
  });

  it('maps a rejected request (generic 401) to a failure result, without throwing', async () => {
    vi.mocked(api.post).mockRejectedValue(Object.assign(new Error('Request failed'), {
      response: { status: 401, data: { error: 'VERIFICATION_FAILED' } },
    }));

    const result = await svc.authenticate('HPX-7K3M-92QD', '0000', 'idem-2');

    expect(result.success).toBe(false);
    expect((result as any).lockedUntil).toBeUndefined(); // a wrong-digit 401 is not a lockout
  });

  it('maps a 429 lockout to a failure WITH lockedUntil, so the UI shows a rate-limit, not "wrong details"', async () => {
    vi.mocked(api.post).mockRejectedValue(Object.assign(new Error('Too many attempts'), {
      response: { status: 429, data: { error: 'TOO_MANY_ATTEMPTS' } },
    }));

    const result = await svc.authenticate('HPX-7K3M-92QD', '1234', 'idem-3');

    expect(result.success).toBe(false);
    expect((result as any).lockedUntil).toBeTruthy();
  });
});

describe('ApiPortalService.getCaseView', () => {
  it('maps backend caseNumber to the FE caseId field', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          caseNumber: 'HPX-7K3M-92QD',
          clientName: 'Arun Sharma',
          status: 'ACTIVE',
          portalActivatedAt: '2026-01-01T00:00:00Z',
          progressStages: [],
          documents: [{ id: 'd1', name: 'KYC Form', status: 'AWAITING_REVIEW', receivedAt: null }],
          notes: [],
        },
      },
    } as any);

    const view = await svc.getCaseView('tok-123');

    expect(view.caseId).toBe('HPX-7K3M-92QD');
    // Backend already scopes to client-visible docs with a 3-category status; they pass through unchanged.
    expect(view.documents).toHaveLength(1);
    expect(view.documents[0].status).toBe('AWAITING_REVIEW');
  });
});
