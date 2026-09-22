import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MandateSection } from './MandateSection';
import { mandateService, type MandateRequestSummary } from '../../services/mandate.service';

// F2 (MandateSection.tsx:65): current = requests.find(r => r.status !== 'SUPERSEDED').
// When the list is empty OR every row is SUPERSEDED, current is undefined and only the
// `!current` empty-state branch (line 101) may render — the status card (line 131,
// `current && <MandateStatusCard .../>`) must be skipped entirely. This test proves that
// path is safe (renders, non-blank, no card) instead of throwing or rendering blank.

vi.mock('../../services/mandate.service', async () => {
  const actual = await vi.importActual<typeof import('../../services/mandate.service')>(
    '../../services/mandate.service',
  );
  return { ...actual, mandateService: { ...actual.mandateService, listForCase: vi.fn() } };
});

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// canView true so the component doesn't early-return null; canSend/canUpload/canVerify
// false so the `!current` branch takes its plain-text arm ("No mandate request yet.")
// rather than the send/upload dashed-box arm — the simplest stable text to assert on.
vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({ permissions: { can: (slug: string) => slug === 'mandate:view' } }),
}));

const EMPTY_STATE_TEXT = 'No mandate request yet.';

const supersededReq: MandateRequestSummary = {
  id: 'req-1',
  mandateType: 'Test Mandate',
  status: 'SUPERSEDED',
  sentToEmail: null,
  sentByUserId: 'user-1',
  verifiedAt: null,
  verifiedBy: null,
  rejectedAt: null,
  rejectedBy: null,
  rejectionReason: null,
  tokenExpiresAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  uploads: [],
};

function renderSection() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MandateSection caseId="case-1" caseStatus="ACTIVE" leadEmail="client@example.com" />
    </QueryClientProvider>,
  );
}

describe('MandateSection safe empty state when current is undefined (F2)', () => {
  it('renders a non-blank empty state and no status card for an empty request list', async () => {
    vi.mocked(mandateService.listForCase).mockResolvedValueOnce([]);

    expect(() => renderSection()).not.toThrow();

    expect(await screen.findByText(EMPTY_STATE_TEXT)).toBeTruthy();
    expect(screen.queryByText('Superseded')).toBeNull();
    expect(screen.queryByText('Test Mandate')).toBeNull();
  });

  it('renders a non-blank empty state and no status card when every request is SUPERSEDED', async () => {
    vi.mocked(mandateService.listForCase).mockResolvedValueOnce([
      supersededReq,
      { ...supersededReq, id: 'req-2' },
    ]);

    expect(() => renderSection()).not.toThrow();

    expect(await screen.findByText(EMPTY_STATE_TEXT)).toBeTruthy();
    expect(screen.queryByText('Superseded')).toBeNull();
    expect(screen.queryByText('Test Mandate')).toBeNull();
  });
});
