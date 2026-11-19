import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DocumentationPage } from './DocumentationPage';
import { documentationService } from '../services/documentation.service';
import { leadService } from '../services/lead.service';
import { leadContactsService } from '../services/lead-contacts.service';
import { waChannelsService } from '../services/wa-channels.service';
import { handoffService } from '../services/handoff.service';
import { api } from '../services/api';
import type { DocCase } from '../types';

// Assigned-user column on the /documentation list (mirrors Sales owner cell):
// name when resolvable, em dash otherwise. The FE renders whatever the API
// returns, so inactive/restricted users look identical to active ones —
// that parity is the backend's job.

vi.mock('../components/notifications/notify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// All permissions off: hides upload/manage/verify affordances we don't
// exercise, and (via mandate:view) keeps MandateSection's early-return-null
// branch so it needs no mocking of mandateService.
vi.mock('../auth/context/AuthContext', () => ({
  useAuth: () => ({ permissions: { can: () => false } }),
}));

vi.mock('../services/documentation.service', () => ({
  documentationService: {
    getCase: vi.fn(),
    listCases: vi.fn(),
    getDashboardKPIs: vi.fn(),
    listPresets: vi.fn(),
  },
}));

vi.mock('../services/lead.service', () => ({
  leadService: { findById: vi.fn() },
}));

vi.mock('../services/lead-contacts.service', () => ({
  leadContactsService: { list: vi.fn() },
}));

vi.mock('../services/wa-channels.service', () => ({
  waChannelsService: { list: vi.fn() },
}));

vi.mock('../services/handoff.service', () => ({
  handoffService: { getIncoming: vi.fn() },
}));

// Covers the direct `await import('../services/api')` the leads query in
// DocumentationPage makes, and doubles as a safety net for any other
// (unmocked) service module that reaches the same real file via `./api`.
vi.mock('../services/api', () => ({
  api: { get: vi.fn() },
}));

type AU = DocCase['assignedUser'];
function mk(id: string, company: string, assignedUser: AU): DocCase {
  return {
    id, leadId: `lead-${id}`, caseNumber: null, status: 'ACTIVE', priority: 0,
    totalDocs: 0, receivedDocs: 0, verifiedDocs: 0, approvedDocs: 0, rejectedDocs: 0,
    mandatoryDocs: 0, mandatoryApproved: 0, completionPercent: 0, isReady: false,
    dueDate: null, closedAt: null, closedReason: null, returnCount: 0,
    portalEnabled: false, portalActivatedAt: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    createdBy: 'user-1', assignedTo: assignedUser?.id ?? null, assignedUser,
    lead: { id: `lead-${id}`, firstName: 'Pat', lastName: 'Lead', company, email: null, phone: null },
    preset: null, documents: [], uploadedDocuments: [],
  } as unknown as DocCase;
}

const cases = [
  mk('a', 'Assigned Co', { id: 'u1', firstName: 'Asha', lastName: 'Rao' }),
  mk('b', 'Unassigned Co', null),
  mk('c', 'NoName Co', { id: 'u3', firstName: null, lastName: null }),
  mk('d', 'Inactive Co', { id: 'u4', firstName: 'Ex', lastName: 'Staff' }),
];

function assignedCell(company: string): string {
  const row = screen.getByText(company).closest('.dense-row') as HTMLElement;
  // children: select, lead, preset, status, assigned, completion
  return (row.children[4] as HTMLElement).textContent ?? '';
}

describe('DocumentationPage — assigned user column', () => {
  it('shows the name, or an em dash when unassigned / unresolved', async () => {
    vi.mocked(documentationService.listCases).mockResolvedValue(
      { data: cases, total: 4, page: 1, pageSize: 50 } as any,
    );
    vi.mocked(documentationService.getDashboardKPIs).mockResolvedValue({
      totalCases: 0, activeCases: 0, readyCases: 0, transferredCases: 0,
      pendingVerification: 0, overdueDocCount: 0, rejectedDocs: 0, todayActivity: 0,
    });
    vi.mocked(documentationService.listPresets).mockResolvedValue([]);
    vi.mocked(handoffService.getIncoming).mockResolvedValue([]);
    vi.mocked(leadService.findById).mockResolvedValue({} as any);
    vi.mocked(leadContactsService.list).mockResolvedValue([]);
    vi.mocked(waChannelsService.list).mockResolvedValue([]);
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } } as any);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/documentation']}>
          <DocumentationPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText('Assigned Co');
    expect(screen.getByText('Assigned')).toBeTruthy(); // header
    expect(assignedCell('Assigned Co')).toBe('Asha Rao');
    expect(assignedCell('Unassigned Co')).toBe('—');
    expect(assignedCell('NoName Co')).toBe('—');
    expect(assignedCell('Inactive Co')).toBe('Ex Staff');
  });
});
