import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DocumentationPage } from './DocumentationPage';
import { documentationService } from '../services/documentation.service';
import { leadService } from '../services/lead.service';
import { leadContactsService } from '../services/lead-contacts.service';
import { waChannelsService } from '../services/wa-channels.service';
import { handoffService } from '../services/handoff.service';
import type { DocCase, DocCasePolicyAssignment } from '../types';

// Mandate as the 3rd tab + Overview policies & components summary.

const h = vi.hoisted(() => ({ canEdit: true }));

vi.mock('../components/notifications/notify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../auth/context/AuthContext', () => ({
  // Only doc:edit is toggled (drives canConfigurePolicies); everything else granted.
  useAuth: () => ({ permissions: { can: (p: string) => (p === 'doc:edit' ? h.canEdit : true) } }),
}));
// Stub MandateSection so we can assert WHERE it renders without its own queries.
vi.mock('../components/mandate/MandateSection', () => ({ MandateSection: () => <div>MANDATE_MARKER</div> }));
vi.mock('../services/documentation.service', () => ({
  documentationService: { getCase: vi.fn(), listCases: vi.fn(), getDashboardKPIs: vi.fn(), listPresets: vi.fn() },
}));
vi.mock('../services/lead.service', () => ({ leadService: { findById: vi.fn() } }));
vi.mock('../services/lead-contacts.service', () => ({ leadContactsService: { list: vi.fn() } }));
vi.mock('../services/wa-channels.service', () => ({ waChannelsService: { list: vi.fn() } }));
vi.mock('../services/handoff.service', () => ({ handoffService: { getIncoming: vi.fn() } }));
vi.mock('../services/api', () => ({ api: { get: vi.fn() } }));
vi.mock('../hooks/useCaseFields', () => ({ useCaseEngineSettings: () => ({ data: { caseOperationsEngineEnabled: true } }) }));
vi.mock('../hooks/useCaseTypes', () => ({ useCaseTypes: () => ({ data: [{ id: 'ct-1', name: 'Export Licence', status: 'ACTIVE' }] }) }));
vi.mock('../hooks/useCaseWorkspace', () => ({
  useAssignCaseType: () => ({ mutate: vi.fn(), isPending: false }),
  useAssignPolicies: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false, error: null }),
}));

const onePolicy: DocCasePolicyAssignment[] = [{
  id: 'pa-1', caseTypeId: 'ct-1', proposalDate: null, actualDate: null, displayOrder: 0, isPrimary: true, derived: false,
  caseType: { id: 'ct-1', name: 'Aatmanirbhar Bharat 2022', key: 'anb', status: 'ACTIVE', deletedAt: null },
  components: [
    { selectionId: 's1', componentId: 'c1', displayOrder: 0, component: { id: 'c1', name: 'Power Connection Charges', description: null, isMandatory: false, displayOrder: 0, isActive: true, deletedAt: null } },
    { selectionId: 's2', componentId: 'c2', displayOrder: 1, component: { id: 'c2', name: 'Electricity Duty', description: null, isMandatory: false, displayOrder: 1, isActive: true, deletedAt: null } },
  ],
}];

function buildDocCase(policyAssignments: DocCasePolicyAssignment[]): DocCase {
  return {
    id: 'case-1', leadId: 'lead-1', caseNumber: null, status: 'ACTIVE', priority: 0,
    totalDocs: 0, receivedDocs: 0, verifiedDocs: 0, approvedDocs: 0, rejectedDocs: 0,
    mandatoryDocs: 0, mandatoryApproved: 0, completionPercent: 0, isReady: false,
    dueDate: null, closedAt: null, closedReason: null, returnCount: 0, portalEnabled: false,
    portalActivatedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    createdBy: 'user-1', caseTypeId: null, policyAssignments,
    lead: { id: 'lead-1', firstName: 'Test', lastName: 'Lead', company: 'Acme Inc', email: 'l@e.com', phone: '9990001111' },
    preset: null, documents: [], uploadedDocuments: [],
  } as unknown as DocCase;
}

function setup(policyAssignments: DocCasePolicyAssignment[] = onePolicy) {
  vi.mocked(documentationService.getCase).mockResolvedValue(buildDocCase(policyAssignments));
  vi.mocked(documentationService.listCases).mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 50 } as any);
  vi.mocked(documentationService.getDashboardKPIs).mockResolvedValue({
    totalCases: 0, activeCases: 0, readyCases: 0, transferredCases: 0,
    pendingVerification: 0, overdueDocCount: 0, rejectedDocs: 0, todayActivity: 0,
  });
  vi.mocked(documentationService.listPresets).mockResolvedValue([]);
  vi.mocked(handoffService.getIncoming).mockResolvedValue([]);
  vi.mocked(leadService.findById).mockResolvedValue({ id: 'lead-1', firstName: 'Test', lastName: 'Lead' } as any);
  vi.mocked(leadContactsService.list).mockResolvedValue([]);
  vi.mocked(waChannelsService.list).mockResolvedValue([]);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/documentation?caseId=case-1']}>
        <DocumentationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CaseDetailPanel — Mandate tab + Overview policies summary', () => {
  beforeEach(() => { vi.clearAllMocks(); h.canEdit = true; });

  it('tab order is exactly Overview, Contacts, Mandate, Documents, History, Notes', async () => {
    setup();
    await screen.findByRole('tab', { name: 'Mandate' });
    // Scope to the modal's tablist — the page also has a Cases/Activities toggle with role=tab.
    const panelTabs = within(screen.getByRole('tablist', { name: 'Case sections' })).getAllByRole('tab');
    expect(panelTabs.map(t => t.textContent)).toEqual(
      ['Overview', 'Contacts', 'Mandate', 'Documents (0)', 'History', 'Notes'],
    );
  });

  it('Mandate renders inside its tab, not on Overview', async () => {
    setup();
    await screen.findByRole('tab', { name: 'Mandate' });
    expect(screen.queryByText('MANDATE_MARKER')).toBeNull(); // Overview is default
    fireEvent.click(screen.getByRole('tab', { name: 'Mandate' }));
    expect(screen.getByText('MANDATE_MARKER')).toBeTruthy();
  });

  it('Overview shows the saved policies and their selected components', async () => {
    setup(onePolicy);
    await screen.findByRole('tab', { name: 'Mandate' });
    expect(screen.getByText('Policies & components')).toBeTruthy();
    expect(screen.getByText('Aatmanirbhar Bharat 2022')).toBeTruthy();
    expect(screen.getByText('Power Connection Charges')).toBeTruthy();
    expect(screen.getByText('Electricity Duty')).toBeTruthy();
  });

  it('Overview shows a clean empty state when no policies are configured', async () => {
    setup([]);
    await screen.findByRole('tab', { name: 'Mandate' });
    expect(screen.queryByText('Policies & components')).toBeNull();
    expect(screen.getByText('Assign policies to populate the documents list')).toBeTruthy();
  });

  it('Overview summary is hidden without doc:edit (canConfigurePolicies false)', async () => {
    h.canEdit = false;
    setup(onePolicy);
    await screen.findByRole('tab', { name: 'Mandate' });
    expect(screen.queryByText('Policies & components')).toBeNull();
    expect(screen.queryByText('Aatmanirbhar Bharat 2022')).toBeNull();
  });
});
