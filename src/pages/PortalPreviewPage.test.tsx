import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { PortalCaseView } from '../types';

// Mock the portal service module: getPortalPreview (dynamic-imported by the page) + portalService (used by
// CaseViewScreen). Each test sets getPortalPreview's behaviour.
vi.mock('../services/portal.service', () => ({
  portalService: { getCaseView: vi.fn() },
  getPortalPreview: vi.fn(),
}));
import { getPortalPreview } from '../services/portal.service';
import { PortalPreviewPage } from './ClientPortalPage';

const view = (over: Partial<PortalCaseView> = {}): PortalCaseView => ({
  caseId: 'HPX-97CY-VXGZ', clientName: 'Prev Client', company: 'Preview Co',
  status: 'DOCUMENTATION_READY', mandateStatus: 'PENDING', portalActive: true,
  portalActivatedAt: new Date().toISOString(), documents: [], notes: [],
  progressStages: [{ key: 'RECEIVED', label: 'Application received', completedAt: null, isCurrent: true }],
  ...over,
});

function renderPreview(impl: () => Promise<PortalCaseView>) {
  (getPortalPreview as unknown as ReturnType<typeof vi.fn>).mockImplementation(impl);
  return render(
    <MemoryRouter initialEntries={['/portal-preview/HPX-97CY-VXGZ']}>
      <Routes><Route path="/portal-preview/:caseId" element={<PortalPreviewPage />} /></Routes>
    </MemoryRouter>,
  );
}

afterEach(() => vi.clearAllMocks());

describe('PortalPreviewPage', () => {
  it('renders the case and the Internal Preview banner for an active case', async () => {
    renderPreview(async () => view({ portalActive: true, company: 'Resolve By Number Ltd' }));
    expect(await screen.findByText('Resolve By Number Ltd')).toBeTruthy();
    expect(screen.getByText(/Internal Preview/i)).toBeTruthy();
    expect(screen.queryByText(/not yet activated/i)).toBeNull();
  });

  it('shows the "not yet activated" notice but still renders content when portalActive is false', async () => {
    renderPreview(async () => view({ portalActive: false }));
    expect(await screen.findByText(/not yet activated for this case/i)).toBeTruthy();
    expect(screen.getByText('Preview Co')).toBeTruthy(); // content still rendered
  });

  it('maps 404 to "Case not found."', async () => {
    renderPreview(async () => { throw { response: { status: 404 } }; });
    expect(await screen.findByText('Case not found.')).toBeTruthy();
  });

  it('maps 403 to a permission message', async () => {
    renderPreview(async () => { throw { response: { status: 403 } }; });
    expect(await screen.findByText(/permission to preview this case/i)).toBeTruthy();
  });
});
