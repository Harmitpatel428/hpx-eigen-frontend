import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentsEditor } from './ComponentsEditor';
import type { CaseType, CaseTypeComponent } from '../../types/caseConfig';

let granted: string[] = ['case-type:manage'];
vi.mock('../../auth/public', () => ({ useAuth: () => ({ permissions: { can: (p: string) => granted.includes(p) } }) }));

const mutate = vi.fn();
let isPending = false;
let components: CaseTypeComponent[] = [];
vi.mock('../../hooks/useCaseTypes', () => ({
  useCaseTypeComponentList: () => ({ data: components, isLoading: false }),
  useCreateComponent: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateComponent: () => ({ mutate, isPending }),
}));
vi.mock('./ComponentDocumentsPanel', () => ({ ComponentDocumentsPanel: () => <div>docs-panel</div> }));

const comp = (over: Partial<CaseTypeComponent> = {}): CaseTypeComponent => ({
  id: 'comp-1', tenantId: 't', caseTypeId: 'ct-1', name: 'Partnership Firm', description: 'Firm docs',
  isMandatory: false, displayOrder: 2, isActive: true, createdAt: '', updatedAt: '', deletedAt: null, ...over,
});
const caseType = { id: 'ct-1' } as CaseType;

const save = () => screen.getByRole('button', { name: /Save|Saving/ });

beforeEach(() => {
  vi.clearAllMocks();
  granted = ['case-type:manage'];
  isPending = false;
  components = [comp(), comp({ id: 'comp-2', name: 'Other', displayOrder: 5 })];
});

describe('ComponentsEditor edit flow', () => {
  it('saves the edited fields (including unchanged isActive) and closes on success', async () => {
    mutate.mockImplementation((_v, o) => o?.onSuccess?.());
    render(<ComponentsEditor caseType={caseType} />);
    await userEvent.click(screen.getAllByRole('button', { name: /Edit/ })[0]);
    const name = screen.getAllByLabelText('Name')[0];
    await userEvent.clear(name);
    await userEvent.type(name, 'New Name');
    await userEvent.click(save());
    expect(mutate).toHaveBeenCalledWith(
      { caseTypeId: 'ct-1', componentId: 'comp-1', payload: { name: 'New Name', description: 'Firm docs', displayOrder: 2, isMandatory: false, isActive: true } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(screen.getAllByLabelText('Name')).toHaveLength(1); // only the add form remains
  });

  it('cancel discards the draft without calling the API', async () => {
    render(<ComponentsEditor caseType={caseType} />);
    await userEvent.click(screen.getAllByRole('button', { name: /Edit/ })[0]);
    await userEvent.type(screen.getAllByLabelText('Name')[0], 'XYZ');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getAllByLabelText('Name')).toHaveLength(1); // only the add form remains
    expect(screen.getByText('Partnership Firm')).toBeInTheDocument();
  });

  it('disables Save for empty name and negative order', async () => {
    render(<ComponentsEditor caseType={caseType} />);
    await userEvent.click(screen.getAllByRole('button', { name: /Edit/ })[0]);
    const name = screen.getAllByLabelText('Name')[0];
    await userEvent.clear(name);
    await userEvent.type(name, '   ');
    expect(save()).toBeDisabled();
    await userEvent.type(name, 'ok');
    expect(save()).toBeEnabled();
    const order = screen.getAllByLabelText('Order')[0];
    fireEvent.change(order, { target: { value: '-1' } });
    expect(save()).toBeDisabled();
    fireEvent.change(order, { target: { value: '1.5' } });
    expect(save()).toBeDisabled();
  });

  it('disables Save while the update is pending', async () => {
    isPending = true;
    render(<ComponentsEditor caseType={caseType} />);
    await userEvent.click(screen.getAllByRole('button', { name: /Edit/ })[0]);
    expect(save()).toBeDisabled();
  });

  it('keeps the editor open when the update fails', async () => {
    mutate.mockImplementation((_v, o) => o?.onError?.(new Error('boom')));
    render(<ComponentsEditor caseType={caseType} />);
    await userEvent.click(screen.getAllByRole('button', { name: /Edit/ })[0]);
    await userEvent.click(save());
    expect(mutate).toHaveBeenCalled();
    expect(screen.getAllByLabelText('Name')).toHaveLength(2);
  });

  it('shows no Edit button without case-type:manage', () => {
    granted = [];
    render(<ComponentsEditor caseType={caseType} />);
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
  });

  it('disables quick-toggles only on the row being edited', async () => {
    render(<ComponentsEditor caseType={caseType} />);
    await userEvent.click(screen.getAllByRole('button', { name: /Edit/ })[0]);
    const mand = screen.getAllByRole('button', { name: 'Make mandatory' });
    const arch = screen.getAllByRole('button', { name: 'Archive' });
    expect(mand[0]).toBeDisabled();
    expect(arch[0]).toBeDisabled();
    expect(mand[1]).toBeEnabled();
    expect(arch[1]).toBeEnabled();
    const docs = screen.getAllByRole('button', { name: 'Documents' });
    expect(docs[0]).toBeEnabled();
    expect(docs[1]).toBeEnabled();
    await userEvent.click(mand[1]);
    expect(mutate).toHaveBeenCalledWith({ caseTypeId: 'ct-1', componentId: 'comp-2', payload: { isMandatory: true } }, undefined);
  });
});
