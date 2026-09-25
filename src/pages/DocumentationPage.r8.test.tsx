import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// R8 (DocumentationPage.tsx ~line 1024-1038): uploaded files are grouped by
// requirement. A file only stays under its requirement when
// `f.category === 'REQUIREMENT' && f.requirementId && liveRequirementIds.has(f.requirementId)`.
// Everything else — genuine GENERAL uploads AND "orphans" (a REQUIREMENT file
// whose requirementId no longer matches a live requirement, e.g. the
// requirement was deleted) — falls to `generalFiles`. Without this, orphans
// rendered nowhere (the bug R8 fixed). DocumentFileRow (~line 285-289) tags
// any REQUIREMENT-category file with "Unlinked requirement", which — since a
// genuine general file is category GENERAL — only ever fires for an orphan
// sitting in the general section.
//
// This test drives the real DocumentationPage (CaseDetailPanel is not
// exported, so it can't be mounted directly) via a `?caseId=` deep link,
// following the T2 pattern (MandateSection.emptyState.test.tsx): fresh
// QueryClientProvider with retries off, and vi.mock for every service /
// auth hook the render path touches.

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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

const LIVE_REQUIREMENT_ID = 'req-live';
const LINKED_FILE_NAME = 'Linked Requirement File.pdf';
const ORPHAN_FILE_NAME = 'Orphaned Requirement File.pdf';
const GENERAL_FILE_NAME = 'General Info Sheet.pdf';

function buildDocCase(): DocCase {
  return {
    id: 'case-1',
    leadId: 'lead-1',
    caseNumber: null,
    status: 'ACTIVE',
    priority: 0,
    totalDocs: 1,
    receivedDocs: 0,
    verifiedDocs: 0,
    approvedDocs: 0,
    rejectedDocs: 0,
    mandatoryDocs: 0,
    mandatoryApproved: 0,
    completionPercent: 0,
    isReady: false,
    dueDate: null,
    closedAt: null,
    closedReason: null,
    returnCount: 0,
    portalEnabled: false,
    portalActivatedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
    lead: {
      id: 'lead-1',
      firstName: 'Test',
      lastName: 'Lead',
      company: 'Acme Inc',
      email: 'lead@example.com',
      phone: '9990001111',
    },
    preset: null,
    // The one LIVE requirement — its id is what `liveRequirementIds` contains.
    // isMandatory: false so it never lands in the "Missing Mandatory
    // Documents" alert too (that would print its name a second time in the
    // same tab and make the row-scoping below ambiguous).
    documents: [
      {
        id: LIVE_REQUIREMENT_ID,
        name: 'Live Requirement',
        description: null,
        isMandatory: false,
        isBlocking: false,
        status: 'REQUESTED',
        receivedAt: null,
        verifiedAt: null,
        expiryDate: null,
        rejectionReason: null,
        verificationRemarks: null,
        storageRefs: [],
      },
    ],
    uploadedDocuments: [
      // Linked: REQUIREMENT file whose requirementId IS in the live list —
      // must render under its requirement, not in the general section.
      {
        id: 'file-linked',
        name: LINKED_FILE_NAME,
        category: 'REQUIREMENT',
        requirementId: LIVE_REQUIREMENT_ID,
        status: 'RECEIVED',
        sourceChannel: 'CLIENT_PORTAL',
        uploadedByParty: 'CLIENT',
        isActive: true,
        checksum: 'checksum-linked',
        expiresAt: null,
      },
      // Orphan: REQUIREMENT file whose requirementId is stale (its
      // requirement was deleted) — the R8 case. Must render in the general
      // section, tagged "Unlinked requirement".
      {
        id: 'file-orphan',
        name: ORPHAN_FILE_NAME,
        category: 'REQUIREMENT',
        requirementId: 'req-DELETED',
        status: 'RECEIVED',
        sourceChannel: 'CLIENT_PORTAL',
        uploadedByParty: 'CLIENT',
        isActive: true,
        checksum: 'checksum-orphan',
        expiresAt: null,
      },
      // Genuine general upload — never had a requirement. Must render in the
      // general section WITHOUT the tag.
      {
        id: 'file-general',
        name: GENERAL_FILE_NAME,
        category: 'GENERAL',
        requirementId: null,
        status: 'RECEIVED',
        sourceChannel: 'FIRM_UPLOAD',
        uploadedByParty: 'FIRM',
        isActive: true,
        checksum: 'checksum-general',
        expiresAt: null,
      },
    ],
  } as unknown as DocCase;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/documentation?caseId=case-1']}>
        <DocumentationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DocumentationPage — orphaned REQUIREMENT file routing (R8)', () => {
  it('tags an orphan in the general section but not a genuine GENERAL file', async () => {
    vi.mocked(documentationService.getCase).mockResolvedValue(buildDocCase());
    vi.mocked(documentationService.listCases).mockResolvedValue(
      { data: [], total: 0, page: 1, pageSize: 50 } as any,
    );
    vi.mocked(documentationService.getDashboardKPIs).mockResolvedValue({
      totalCases: 0, activeCases: 0, readyCases: 0, transferredCases: 0,
      pendingVerification: 0, overdueDocCount: 0, rejectedDocs: 0, todayActivity: 0,
    });
    vi.mocked(documentationService.listPresets).mockResolvedValue([]);
    vi.mocked(handoffService.getIncoming).mockResolvedValue([]);
    vi.mocked(leadService.findById).mockResolvedValue(
      { id: 'lead-1', firstName: 'Test', lastName: 'Lead' } as any,
    );
    vi.mocked(leadContactsService.list).mockResolvedValue([]);
    vi.mocked(waChannelsService.list).mockResolvedValue([]);
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } } as any);

    const user = userEvent.setup();
    renderPage();

    const documentsTab = await screen.findByRole('tab', { name: /^Documents/ });
    await user.click(documentsTab);

    const generalHeading = await screen.findByText('General documents');
    const generalSection = generalHeading.parentElement as HTMLElement;

    // Orphan renders in the general section WITH the tag (row-scoped, not
    // "the tag exists somewhere on the page").
    const orphanNameEl = within(generalSection).getByText(ORPHAN_FILE_NAME);
    const orphanRow = orphanNameEl.parentElement as HTMLElement;
    expect(within(orphanRow).getByText('Unlinked requirement')).toBeTruthy();

    // Genuine GENERAL file renders in the same section WITHOUT the tag.
    const generalNameEl = within(generalSection).getByText(GENERAL_FILE_NAME);
    const generalRow = generalNameEl.parentElement as HTMLElement;
    expect(within(generalRow).queryByText('Unlinked requirement')).toBeNull();

    // The linked file must not have been swept into the general section.
    expect(within(generalSection).queryByText(LINKED_FILE_NAME)).toBeNull();

    // Optional differentiator: expanding the live requirement shows its
    // linked file, never the orphan — proving the orphan was routed away,
    // not merely duplicated.
    await user.click(screen.getByText('Live Requirement'));
    const uploadedFilesHeading = await screen.findByText('Uploaded files');
    const requirementFilesSection = uploadedFilesHeading.parentElement!.parentElement as HTMLElement;
    expect(within(requirementFilesSection).getByText(LINKED_FILE_NAME)).toBeTruthy();
    expect(within(requirementFilesSection).queryByText(ORPHAN_FILE_NAME)).toBeNull();
  });
});
