import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DocumentationPage } from './DocumentationPage';
import { documentationService } from '../services/documentation.service';
import { leadService } from '../services/lead.service';
import { leadContactsService } from '../services/lead-contacts.service';
import { waChannelsService } from '../services/wa-channels.service';
import { handoffService } from '../services/handoff.service';
import type { DocCase, DocCaseDocumentComponentSource } from '../types';

// A merged requirement must render ONCE and name the components that require it.

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../auth/context/AuthContext', () => ({ useAuth: () => ({ permissions: { can: () => true } }) }));
vi.mock('../services/documentation.service', () => ({
  documentationService: { getCase: vi.fn(), listCases: vi.fn(), getDashboardKPIs: vi.fn(), listPresets: vi.fn() },
}));
vi.mock('../services/lead.service', () => ({ leadService: { findById: vi.fn() } }));
vi.mock('../services/lead-contacts.service', () => ({ leadContactsService: { list: vi.fn() } }));
vi.mock('../services/wa-channels.service', () => ({ waChannelsService: { list: vi.fn() } }));
vi.mock('../services/handoff.service', () => ({ handoffService: { getIncoming: vi.fn() } }));
vi.mock('../services/api', () => ({ api: { get: vi.fn() } }));
vi.mock('../hooks/useCaseFields', () => ({ useCaseEngineSettings: () => ({ data: { caseOperationsEngineEnabled: true } }) }));
vi.mock('../hooks/useCaseTypes', () => ({ useCaseTypes: () => ({ data: [] }) }));
vi.mock('../hooks/useCaseWorkspace', () => ({
  useAssignCaseType: () => ({ mutate: vi.fn(), isPending: false }),
  useAssignPolicies: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('../components/case-workspace/FieldsTab', () => ({ FieldsTab: () => <div /> }));
vi.mock('../components/case-workspace/StagesTab', () => ({ StagesTab: () => <div /> }));

const source = (over: Partial<DocCaseDocumentComponentSource> = {}): DocCaseDocumentComponentSource => ({
  id: `s-${Math.random()}`, componentId: 'comp-a', componentName: 'Component A',
  componentDocumentId: 'cd-1', componentDocumentName: 'PAN',
  policyAssignmentId: 'pa-1', policyComponentId: 'pc-1',
  isMandatoryAtLink: false, displayOrderAtLink: 0,
  componentDocument: { isActive: true, deletedAt: null }, ...over,
});

function buildDocCase(documents: unknown[]): DocCase {
  return {
    id: 'case-1', leadId: 'lead-1', caseNumber: null, status: 'ACTIVE', priority: 0,
    totalDocs: documents.length, receivedDocs: 0, verifiedDocs: 0, approvedDocs: 0, rejectedDocs: 0,
    mandatoryDocs: 0, mandatoryApproved: 0, completionPercent: 0, isReady: false,
    dueDate: null, closedAt: null, closedReason: null, returnCount: 0, portalEnabled: false,
    portalActivatedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    createdBy: 'user-1', caseTypeId: null,
    lead: { id: 'lead-1', firstName: 'Test', lastName: 'Lead', company: 'Acme', email: null, phone: null },
    preset: null, documents, uploadedDocuments: [],
  } as unknown as DocCase;
}

async function setup(documents: unknown[]) {
  vi.mocked(documentationService.getCase).mockResolvedValue(buildDocCase(documents));
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
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/documentation?caseId=case-1']}>
        <DocumentationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  // Requirements live on the Documents tab.
  await userEvent.click(await screen.findByRole('tab', { name: /Documents/ }));
}

const mergedDoc = (sources: DocCaseDocumentComponentSource[]) => ({
  id: 'doc-pan', name: 'PAN', description: null, isMandatory: true, isBlocking: false,
  displayOrder: 1, status: 'REQUESTED', storageRefs: [],
  requirementDedupeKey: 'compdoc:pan', isComponentMerged: true, componentSources: sources,
});

beforeEach(() => vi.clearAllMocks());

describe('Documents section — component provenance', () => {
  it('renders a common requirement once, names its components, and shows the COMMON badge', async () => {
    await setup([mergedDoc([
      source({ componentId: 'comp-a', componentName: 'Component A' }),
      source({ componentId: 'comp-b', componentName: 'Component B' }),
    ])]);
    expect(await screen.findAllByText('PAN')).toHaveLength(1);
    expect(screen.getByText('Required by: Component A, Component B')).toBeInTheDocument();
    expect(screen.getByText('COMMON')).toBeInTheDocument();
  });

  it('shows no COMMON badge when every source is the same component, and de-duplicates the names', async () => {
    await setup([mergedDoc([
      source({ componentId: 'comp-a', componentName: 'Component A', componentDocumentId: 'cd-1' }),
      source({ componentId: 'comp-a', componentName: 'Component A', componentDocumentId: 'cd-2' }),
    ])]);
    expect(await screen.findByText('Required by: Component A')).toBeInTheDocument();
    expect(screen.queryByText('COMMON')).toBeNull();
  });

  it('renders safely when componentSources is absent, with no provenance line', async () => {
    await setup([{
      id: 'doc-manual', name: 'Manual Doc', description: null, isMandatory: false, isBlocking: false,
      displayOrder: 1, status: 'REQUESTED', storageRefs: [],
    }]);
    expect(await screen.findByText('Manual Doc')).toBeInTheDocument();
    expect(screen.queryByText(/Required by:/)).toBeNull();
    expect(screen.queryByText('COMMON')).toBeNull();
  });
});
