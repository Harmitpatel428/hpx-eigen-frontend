import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DocumentationPage } from './DocumentationPage';
import { documentationService } from '../services/documentation.service';
import { leadService } from '../services/lead.service';
import { leadContactsService } from '../services/lead-contacts.service';
import { waChannelsService } from '../services/wa-channels.service';
import { handoffService } from '../services/handoff.service';
import type { DocCase } from '../types';

// Task 4 (Phase 11): engine tabs + assign-case-type control in CaseDetailPanel.

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../auth/context/AuthContext', () => ({
  useAuth: () => ({ permissions: { can: () => true } }),
}));
vi.mock('../services/documentation.service', () => ({
  documentationService: { getCase: vi.fn(), listCases: vi.fn(), getDashboardKPIs: vi.fn(), listPresets: vi.fn() },
}));
vi.mock('../services/lead.service', () => ({ leadService: { findById: vi.fn() } }));
vi.mock('../services/lead-contacts.service', () => ({ leadContactsService: { list: vi.fn() } }));
vi.mock('../services/wa-channels.service', () => ({ waChannelsService: { list: vi.fn() } }));
vi.mock('../services/handoff.service', () => ({ handoffService: { getIncoming: vi.fn() } }));
vi.mock('../services/api', () => ({ api: { get: vi.fn() } }));
vi.mock('../hooks/useCaseFields', () => ({
  useCaseEngineSettings: () => ({ data: { caseOperationsEngineEnabled: true } }),
}));
vi.mock('../hooks/useCaseTypes', () => ({
  useCaseTypes: () => ({ data: [{ id: 'ct-1', name: 'Export Licence', status: 'ACTIVE' }] }),
}));
vi.mock('../hooks/useCaseWorkspace', () => ({
  useAssignCaseType: () => ({ mutate: vi.fn(), isPending: false }),
  useAssignPolicies: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('../components/case-workspace/FieldsTab', () => ({ FieldsTab: () => <div /> }));
vi.mock('../components/case-workspace/StagesTab', () => ({ StagesTab: () => <div /> }));

function buildDocCase(caseTypeId: string | null): DocCase {
  return {
    id: 'case-1', leadId: 'lead-1', caseNumber: null, status: 'ACTIVE', priority: 0,
    totalDocs: 0, receivedDocs: 0, verifiedDocs: 0, approvedDocs: 0, rejectedDocs: 0,
    mandatoryDocs: 0, mandatoryApproved: 0, completionPercent: 0, isReady: false,
    dueDate: null, closedAt: null, closedReason: null, returnCount: 0, portalEnabled: false,
    portalActivatedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    createdBy: 'user-1', caseTypeId,
    lead: { id: 'lead-1', firstName: 'Test', lastName: 'Lead', company: 'Acme Inc', email: 'l@e.com', phone: '9990001111' },
    preset: null, documents: [], uploadedDocuments: [],
  } as unknown as DocCase;
}

function setup(caseTypeId: string | null) {
  vi.mocked(documentationService.getCase).mockResolvedValue(buildDocCase(caseTypeId));
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

describe('CaseDetailPanel engine tabs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('legacy case (no caseTypeId): no Fields/Stages tabs, shows policy configuration control', async () => {
    setup(null);
    await screen.findByRole('tab', { name: 'History' });
    expect(screen.queryByRole('tab', { name: 'Fields' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Stages' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Configure policies' })).toBeTruthy();
    expect(screen.getByText('Assign policies to populate the documents list')).toBeTruthy();
  });

  it('typed case: shows Fields + Stages tabs and History label, plus policy control', async () => {
    setup('ct-1');
    expect(await screen.findByRole('tab', { name: 'Fields' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Stages' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'History' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Timeline' })).toBeNull();
    // The policy configuration control is always available (gated by engine + doc:edit), not hidden once typed.
    expect(screen.getByRole('button', { name: /Configure policies|Edit policies/ })).toBeTruthy();
  });
});
