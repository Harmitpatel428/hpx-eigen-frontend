// @vitest-environment node
// Contract tests for the real-API portal adapter. These pin the FE adapter to the backend envelope:
// POST /verify → { success, data:{sessionToken,expiresAt} }; GET /case → { data:{ caseNumber, documents:[...] } }.
// They also pin that the CLIENT portal calls go through `publicApi` (not the staff-authed `api`) so a logged-in
// staff session can never hijack the portal session token.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publicApi } from './http';
import { ApiPortalService } from './portal.service';

vi.mock('./http', () => ({ publicApi: { post: vi.fn(), get: vi.fn() }, api: { get: vi.fn() } }));

const svc = new ApiPortalService();

beforeEach(() => {
  vi.mocked(publicApi.post).mockReset();
  vi.mocked(publicApi.get).mockReset();
});

describe('ApiPortalService.authenticate', () => {
  it('maps the backend success envelope to a success PortalAuthResult', async () => {
    vi.mocked(publicApi.post).mockResolvedValue({
      data: { success: true, data: { sessionToken: 'tok-123', expiresAt: '2026-01-01T00:00:00Z' } },
    } as any);

    const result = await svc.authenticate('HPX-7K3M-92QD', '3210', 'idem-1');

    expect(result.success).toBe(true);
    expect(result).toMatchObject({ sessionToken: 'tok-123', expiresAt: '2026-01-01T00:00:00Z' });
  });

  it('maps a rejected request (generic 401) to a failure result, without throwing', async () => {
    vi.mocked(publicApi.post).mockRejectedValue(Object.assign(new Error('Request failed'), {
      response: { status: 401, data: { error: 'VERIFICATION_FAILED' } },
    }));

    const result = await svc.authenticate('HPX-7K3M-92QD', '0000', 'idem-2');

    expect(result.success).toBe(false);
    expect((result as any).lockedUntil).toBeUndefined(); // a wrong-digit 401 is not a lockout
  });

  it('maps a 429 lockout to a failure WITH lockedUntil, so the UI shows a rate-limit, not "wrong details"', async () => {
    vi.mocked(publicApi.post).mockRejectedValue(Object.assign(new Error('Too many attempts'), {
      response: { status: 429, data: { error: 'TOO_MANY_ATTEMPTS' } },
    }));

    const result = await svc.authenticate('HPX-7K3M-92QD', '1234', 'idem-3');

    expect(result.success).toBe(false);
    expect((result as any).lockedUntil).toBeTruthy();
  });
});

describe('ApiPortalService.getCaseView', () => {
  const payload = {
    caseNumber: 'HPX-7K3M-92QD', clientName: 'Arun Sharma', company: null, status: 'ACTIVE',
    mandateStatus: 'PENDING', portalActive: true, portalActivatedAt: '2026-01-01T00:00:00Z',
    progressStages: [], notes: [],
    documents: [{ id: 'd1', name: 'KYC Form', status: 'AWAITING_REVIEW', receivedAt: null }],
  };

  it('maps backend caseNumber to the FE caseId field and passes the contract payload through', async () => {
    vi.mocked(publicApi.get).mockResolvedValue({ data: { success: true, data: payload } } as any);

    const view = await svc.getCaseView('tok-123');

    expect(view.caseId).toBe('HPX-7K3M-92QD');
    expect(view.mandateStatus).toBe('PENDING');
    expect(view.portalActive).toBe(true);
    expect(view.documents).toHaveLength(1);
    expect(view.documents[0].status).toBe('AWAITING_REVIEW');
  });

  it('ROOT CAUSE: fetches via the PUBLIC client with the portal session token (never the staff-authed api)', async () => {
    vi.mocked(publicApi.get).mockResolvedValue({ data: { success: true, data: payload } } as any);

    await svc.getCaseView('PORTAL-SESSION-TOK');

    // The portal session Bearer is passed explicitly and goes through publicApi, which never overrides it with
    // a stored staff token (unlike the authed `api` interceptor that caused the "Unable to load case details").
    expect(publicApi.get).toHaveBeenCalledWith('/api/v1/portal/case', {
      headers: { Authorization: 'Bearer PORTAL-SESSION-TOK' },
    });
  });
});
