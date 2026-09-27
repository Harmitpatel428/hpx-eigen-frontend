import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MandateSection } from './MandateSection';
import { mandateService, type MandateRequestSummary } from '../../services/mandate.service';

// Covers the fix for the empty-state flash: MandateSection must branch on query
// STATUS (isPending / isError / isSuccess), never on data presence. Before the
// fix, `data: requests = []` defaulted to an empty array during isPending, so
// `current` was undefined and the "No mandate requested yet" empty state (and
// its Send/Upload actions) rendered during genuine loading — a flash that then
// swapped to the real content once the query resolved.

vi.mock('../../services/mandate.service', async () => {
  const actual = await vi.importActual<typeof import('../../services/mandate.service')>(
    '../../services/mandate.service',
  );
  return { ...actual, mandateService: { ...actual.mandateService, listForCase: vi.fn() } };
});

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// canView + canSend + canUpload true so the empty state takes its
// send/upload dashed-box arm (exercises both actions in case 2).
vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({
    permissions: {
      can: (slug: string) => ['mandate:view', 'mandate:send', 'mandate:upload', 'mandate:verify'].includes(slug),
    },
  }),
}));

const EMPTY_STATE_TEXT = 'No mandate requested yet';

// The mocked listForCase is a single vi.fn() shared across every test in this
// file (vi.mock's factory runs once per module); reset it between tests so
// call counts and queued once-values from an earlier test never leak in.
beforeEach(() => {
  vi.mocked(mandateService.listForCase).mockReset();
});

function buildReq(overrides: Partial<MandateRequestSummary> = {}): MandateRequestSummary {
  return {
    id: 'req-1',
    mandateType: 'Signed authorization form',
    status: 'PENDING_UPLOAD',
    sentToEmail: 'client@example.com',
    sentByUserId: 'user-1',
    verifiedAt: null,
    verifiedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: null,
    tokenExpiresAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    uploads: [],
    ...overrides,
  };
}

function renderSection(caseId = 'case-1', qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return render(
    <QueryClientProvider client={qc}>
      <MandateSection caseId={caseId} caseStatus="ACTIVE" leadEmail="client@example.com" />
    </QueryClientProvider>,
  );
}

describe('MandateSection — status-driven rendering (no empty-state flash)', () => {
  it('isPending: shows a loading skeleton, never the empty state', async () => {
    // Never-resolving promise keeps the query in isPending for the assertion window.
    vi.mocked(mandateService.listForCase).mockReturnValueOnce(new Promise(() => {}));

    renderSection();

    expect(screen.queryByText(EMPTY_STATE_TEXT)).toBeNull();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('isSuccess + empty list: shows the empty state with Send and Upload actions', async () => {
    vi.mocked(mandateService.listForCase).mockResolvedValueOnce([]);

    renderSection();

    expect(await screen.findByText(EMPTY_STATE_TEXT)).toBeTruthy();
    // "Send Mandate" (empty-state action) is exact-distinct from the header's
    // "Send Mandate Request" button, so a single exact-name match proves it rendered.
    expect(screen.getByRole('button', { name: 'Send Mandate' })).toBeTruthy();
    // "Upload Mandate" is used verbatim by BOTH the header button and the
    // empty-state action button — two buttons sharing that exact name proves
    // the empty state's Upload action rendered alongside the header's.
    expect(screen.getAllByRole('button', { name: 'Upload Mandate' })).toHaveLength(2);
  });

  it('isSuccess + mandate: shows MandateStatusCard with the status label and mandate type', async () => {
    vi.mocked(mandateService.listForCase).mockResolvedValueOnce([buildReq()]);

    renderSection();

    expect(await screen.findByText('Signed authorization form')).toBeTruthy();
    expect(screen.getByText('Pending upload')).toBeTruthy();
    expect(screen.queryByText(EMPTY_STATE_TEXT)).toBeNull();
  });

  it('isError: shows an error state with a working Retry control', async () => {
    vi.mocked(mandateService.listForCase)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce([]);

    renderSection();

    expect(await screen.findByText("Couldn't load mandate status.")).toBeTruthy();
    const retryBtn = screen.getByRole('button', { name: 'Retry' });

    const user = userEvent.setup();
    await user.click(retryBtn);

    expect(await screen.findByText(EMPTY_STATE_TEXT)).toBeTruthy();
    expect(mandateService.listForCase).toHaveBeenCalledTimes(2);
  });

  it('caseId switch: case B never shows case A\'s mandate (no cross-caseId leakage)', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(mandateService.listForCase).mockImplementation((caseId: string) =>
      caseId === 'case-A' ? Promise.resolve([buildReq({ mandateType: 'Case A Mandate' })]) : Promise.resolve([]),
    );

    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <MandateSection caseId="case-A" caseStatus="ACTIVE" leadEmail="a@example.com" />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Case A Mandate')).toBeTruthy();

    rerender(
      <QueryClientProvider client={qc}>
        <MandateSection caseId="case-B" caseStatus="ACTIVE" leadEmail="b@example.com" />
      </QueryClientProvider>,
    );

    // New caseId with no cached entry starts isPending again — never renders
    // stale case-A content, and never jumps straight to the empty state either.
    expect(screen.queryByText('Case A Mandate')).toBeNull();

    expect(await screen.findByText(EMPTY_STATE_TEXT)).toBeTruthy();
    expect(screen.queryByText('Case A Mandate')).toBeNull();
  });
});
