import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PolicyAssignmentDialog } from '../components/case-workspace/PolicyAssignmentDialog';
import { caseWorkspaceService } from '../services/case-workspace.service';
import type { CaseType } from '../types/caseConfig';
import type { DocCasePolicyAssignment } from '../types';

vi.mock('../services/case-workspace.service', () => ({
  caseWorkspaceService: { listCaseTypeComponents: vi.fn(), assignPolicies: vi.fn() },
}));

const svc = vi.mocked(caseWorkspaceService);

const CT = (over: Partial<CaseType> = {}): CaseType => ({
  id: 'ct-1', tenantId: 't', key: 'exp', name: 'Export Licence', description: null,
  status: 'ACTIVE', displayOrder: 0, createdAt: '', updatedAt: '', deletedAt: null, ...over,
});
const comp = (id: string, name: string, isMandatory = false) => ({ id, name, isMandatory, displayOrder: 0, isActive: true });

function renderDialog(opts: { caseTypes?: CaseType[]; existing?: DocCasePolicyAssignment[] } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={qc}>
      <PolicyAssignmentDialog
        caseId="case-1"
        isOpen
        onClose={onClose}
        caseTypes={opts.caseTypes ?? [CT()]}
        existing={opts.existing ?? []}
      />
    </QueryClientProvider>,
  );
  return { qc, onClose, ...utils };
}

const saveBtn = () => screen.getByRole('button', { name: /^Save|Saving/ });

beforeEach(() => {
  vi.clearAllMocks();
  svc.listCaseTypeComponents.mockResolvedValue([]);
  svc.assignPolicies.mockResolvedValue({});
});

describe('PolicyAssignmentDialog', () => {
  it('Save disabled with no policy selected', () => {
    renderDialog({ existing: [] });
    expect(saveBtn()).toBeDisabled();
    expect(screen.getByText('Select at least one policy.')).toBeInTheDocument();
  });

  it('Save disabled while a selected active policy is loading components', async () => {
    svc.listCaseTypeComponents.mockReturnValue(new Promise(() => {})); // never resolves
    renderDialog({ existing: [], caseTypes: [CT()] });
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ct-1');
    await screen.findByText('Export Licence');
    expect(saveBtn()).toBeDisabled();
    expect(screen.getAllByText(/Loading components/).length).toBeGreaterThan(0);
  });

  it('Save disabled when a newly-added policy has active components but none selected; enabled after selecting', async () => {
    svc.listCaseTypeComponents.mockResolvedValue([comp('cmp-1', 'Aadhaar', true)]);
    renderDialog({ existing: [], caseTypes: [CT()] });
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ct-1');
    const checkbox = await screen.findByLabelText(/Aadhaar/);
    expect(saveBtn()).toBeDisabled();
    await userEvent.click(checkbox);
    await waitFor(() => expect(saveBtn()).toBeEnabled());
  });

  it('Save enabled (dates optional) when a selected policy has no active components', async () => {
    svc.listCaseTypeComponents.mockResolvedValue([]);
    renderDialog({ existing: [], caseTypes: [CT()] });
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ct-1');
    await screen.findByText('No components configured for this policy.');
    await waitFor(() => expect(saveBtn()).toBeEnabled());
  });

  it('prefills existing assignments (checked component + dates) when editing', async () => {
    svc.listCaseTypeComponents.mockResolvedValue([comp('cmp-1', 'Aadhaar')]);
    const existing: DocCasePolicyAssignment[] = [{
      id: 'pa-1', caseTypeId: 'ct-1', proposalDate: '2026-02-01', actualDate: null, displayOrder: 0,
      isPrimary: true, derived: false, caseType: { id: 'ct-1', name: 'Export Licence', key: 'exp', status: 'ACTIVE', deletedAt: null },
      components: [{ selectionId: 's1', componentId: 'cmp-1', displayOrder: 0, component: { id: 'cmp-1', name: 'Aadhaar', description: null, isMandatory: false, displayOrder: 0, isActive: true, deletedAt: null } }],
    }];
    renderDialog({ existing, caseTypes: [CT()] });
    const checkbox = await screen.findByLabelText(/Aadhaar/);
    expect(checkbox).toBeChecked();
    expect(screen.getByDisplayValue('2026-02-01')).toBeInTheDocument();
    expect(screen.getByText('PRIMARY')).toBeInTheDocument();
  });

  it('derived legacy ACTIVE policy shows editable component checkboxes', async () => {
    svc.listCaseTypeComponents.mockResolvedValue([comp('cmp-1', 'Aadhaar')]);
    const existing: DocCasePolicyAssignment[] = [{
      id: 'legacy:ct-1', caseTypeId: 'ct-1', proposalDate: null, actualDate: null, displayOrder: 0,
      isPrimary: true, derived: true, caseType: { id: 'ct-1', name: 'Export Licence', key: 'exp', status: 'ACTIVE', deletedAt: null },
      components: [],
    }];
    renderDialog({ existing, caseTypes: [CT()] });
    const checkbox = await screen.findByLabelText(/Aadhaar/);
    expect(checkbox).toBeEnabled();
    expect(checkbox).not.toBeChecked();
  });

  it('archived assigned policy renders components read-only', async () => {
    const existing: DocCasePolicyAssignment[] = [{
      id: 'pa-1', caseTypeId: 'ct-1', proposalDate: null, actualDate: null, displayOrder: 0,
      isPrimary: true, derived: false, caseType: { id: 'ct-1', name: 'Old Licence', key: 'old', status: 'ARCHIVED', deletedAt: '2026-01-01' },
      components: [{ selectionId: 's1', componentId: 'cmp-1', displayOrder: 0, component: { id: 'cmp-1', name: 'Aadhaar', description: null, isMandatory: false, displayOrder: 0, isActive: false, deletedAt: null } }],
    }];
    renderDialog({ existing, caseTypes: [] });
    expect(await screen.findByText(/Components \(read-only\)/)).toBeInTheDocument();
    expect(screen.getByText('ARCHIVED')).toBeInTheDocument();
    // no checkbox for an archived policy's components
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('shows backend validation error without closing the dialog', async () => {
    svc.listCaseTypeComponents.mockResolvedValue([]);
    svc.assignPolicies.mockRejectedValue({ response: { data: { message: 'Policy must be ACTIVE.' } } });
    const { onClose } = renderDialog({ existing: [], caseTypes: [CT()] });
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ct-1');
    await screen.findByText('No components configured for this policy.');
    await waitFor(() => expect(saveBtn()).toBeEnabled());
    await userEvent.click(saveBtn());
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('successful save sends the payload and invalidates the four case/list/handoff/dashboard keys', async () => {
    svc.listCaseTypeComponents.mockResolvedValue([]);
    const { qc, onClose } = renderDialog({ existing: [], caseTypes: [CT()] });
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'ct-1');
    await screen.findByText('No components configured for this policy.');
    await waitFor(() => expect(saveBtn()).toBeEnabled());
    await userEvent.click(saveBtn());

    await waitFor(() => expect(svc.assignPolicies).toHaveBeenCalledWith('case-1', expect.objectContaining({
      policies: [expect.objectContaining({ caseTypeId: 'ct-1', componentIds: [] })],
      primaryCaseTypeId: 'ct-1',
    })));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const keys = invalidate.mock.calls.map((c) => JSON.stringify((c[0] as any)?.queryKey));
    expect(keys).toEqual(expect.arrayContaining([
      JSON.stringify(['doc-case', 'case-1']),
      JSON.stringify(['doc-cases']),
      JSON.stringify(['incoming-handoffs']),
      JSON.stringify(['doc-dashboard']),
    ]));
  });
});
