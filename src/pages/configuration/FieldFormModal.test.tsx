import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FieldFormModal } from './FieldFormModal';

const m = vi.hoisted(() => ({ update: vi.fn(), createOpt: vi.fn() }));
vi.mock('../../auth/public', () => ({ useAuth: () => ({ permissions: { can: () => true } }) }));
vi.mock('../../context/DepartmentContext', () => ({ useDepartment: () => ({ activeDepartment: { id: 'd1' } }) }));
vi.mock('../../hooks/useCaseFields', () => ({
  useCaseFieldOptions: () => ({ data: [], isLoading: false }),
  useCreateField: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateField: () => ({ mutate: m.update, isPending: false }),
  useCreateOption: () => ({ mutate: m.createOpt, isPending: false }),
  useUpdateOption: () => ({ mutate: vi.fn(), isPending: false }),
  useArchiveOption: () => ({ mutate: vi.fn(), isPending: false }),
}));

const field: any = { id: 'f1', key: 'loan_type', name: 'Loan', type: 'SELECT', status: 'DRAFT', reportable: false, filterable: false, validationRules: {}, description: null };

describe('FieldFormModal options editor', () => {
  it('Enter in new-option input adds option and does not save the field', () => {
    render(<FieldFormModal isOpen onClose={() => {}} field={field} />);
    fireEvent.change(screen.getByLabelText('New option key'), { target: { value: 'a' } });
    fireEvent.change(screen.getByLabelText('New option label'), { target: { value: 'A' } });
    fireEvent.keyDown(screen.getByLabelText('New option key'), { key: 'Enter' });
    expect(m.createOpt).toHaveBeenCalledTimes(1);
    expect(m.update).not.toHaveBeenCalled();
  });
});
