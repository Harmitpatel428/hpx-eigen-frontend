import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldBuilder } from './FieldBuilder';

let perms: string[] = [];
vi.mock('../../auth/public', () => ({ useAuth: () => ({ permissions: { can: (p: string) => perms.includes(p) } }) }));
vi.mock('../../context/DepartmentContext', () => ({ useDepartment: () => ({ activeDepartment: { id: 'd1' } }) }));
vi.mock('../../hooks/useCaseFields', () => {
  const mut = () => ({ mutate: vi.fn(), isPending: false });
  return {
  useCaseFields: () => ({ isLoading: false, data: [{ id: 'f1', key: 'loan_type', name: 'Loan type', type: 'TEXT', status: 'DRAFT', reportable: true, filterable: false, validationRules: {}, description: null }] }),
  useCaseFieldOptions: () => ({ data: [], isLoading: false }),
  useCreateField: mut, useUpdateField: mut, useActivateField: mut, useSetFieldReadOnly: mut,
  useArchiveField: mut, useCreateOption: mut, useUpdateOption: mut, useArchiveOption: mut,
  };
});

describe('FieldBuilder permission gating', () => {
  beforeEach(() => { perms = []; });

  it('view-only: no New field / row actions', () => {
    perms = ['case-field:view'];
    render(<FieldBuilder />);
    expect(screen.getByText('Loan type')).toBeTruthy();
    expect(screen.queryByText('New field')).toBeNull();
    expect(screen.queryByText('Edit')).toBeNull();
    expect(screen.queryByText('Activate')).toBeNull();
  });

  it('manage: New field + actions present', () => {
    perms = ['case-field:view', 'case-field:manage'];
    render(<FieldBuilder />);
    expect(screen.getByText('New field')).toBeTruthy();
    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.getByText('Activate')).toBeTruthy();
  });
});
