import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { PortalCaseView } from '../types';

// Mock the portal service singleton so the poll test can count fetches.
vi.mock('../services/portal.service', () => ({
  portalService: { getCaseView: vi.fn() },
}));
import { portalService } from '../services/portal.service';
import { CaseViewScreen } from './ClientPortalPage';

const view = (mandateStatus: 'UPLOADED' | 'PENDING'): PortalCaseView => ({
  caseId: 'HPX-TEST-0001',
  clientName: 'Test Client',
  company: 'Test Co',
  status: 'ACTIVE',
  mandateStatus,
  portalActivatedAt: new Date().toISOString(),
  documents: [],
  notes: [],
  progressStages: [{ key: 'RECEIVED', label: 'Application received', completedAt: null, isCurrent: true }],
});

describe('CaseViewScreen mandate chip', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows "Mandate pending" when the mandate is PENDING', () => {
    render(<CaseViewScreen sessionToken="" caseId="c" previewData={view('PENDING')} />);
    expect(screen.getByText('Mandate pending')).toBeTruthy(); // getByText throws if absent
    expect(screen.queryByText('Mandate uploaded')).toBeNull();
  });

  it('shows "Mandate uploaded" when the mandate is UPLOADED', () => {
    render(<CaseViewScreen sessionToken="" caseId="c" previewData={view('UPLOADED')} />);
    expect(screen.getByText('Mandate uploaded')).toBeTruthy();
  });
});

describe('CaseViewScreen 30s poll', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('refetches once per 30s interval while the tab is visible', async () => {
    (portalService.getCaseView as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(view('PENDING'));

    render(<CaseViewScreen sessionToken="tok" caseId="c" />);
    // Initial load fires on mount.
    expect(portalService.getCaseView).toHaveBeenCalledTimes(1);

    // One poll interval → one more fetch.
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(portalService.getCaseView).toHaveBeenCalledTimes(2);

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(portalService.getCaseView).toHaveBeenCalledTimes(3);
  });
});
