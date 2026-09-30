import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CaseTypeBuilder } from './CaseTypeBuilder';

let perms: string[] = [];
vi.mock('../../auth/public', () => ({ useAuth: () => ({ permissions: { can: (p: string) => perms.includes(p) } }) }));
vi.mock('../../hooks/useCaseFields', () => ({ useCaseFields: () => ({ data: [], isLoading: false }) }));
vi.mock('../../hooks/useCaseTypes', () => {
  const mut = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useCaseTypes: () => ({ isLoading: false, data: [{ id: 'c1', key: 'loan_case', name: 'Loan case', description: null, status: 'DRAFT', displayOrder: 0 }] }),
    usePlacements: () => ({ data: [], isLoading: false }),
    useCreateCaseType: mut, useUpdateCaseType: mut, usePublishCaseType: mut, useArchiveCaseType: mut,
    useAddPlacement: mut, useUpdatePlacement: mut, useRemovePlacement: mut,
  };
});

describe('CaseTypeBuilder permission gating', () => {
  beforeEach(() => { perms = []; });

  it('view-only: no controls', () => {
    perms = ['case-type:view'];
    render(<CaseTypeBuilder />);
    expect(screen.getByText('Loan case')).toBeTruthy();
    for (const t of ['New case type', 'Edit', 'Publish', 'Archive']) expect(screen.queryByText(t)).toBeNull();
  });

  it('manage: New/Edit/Archive but no Publish', () => {
    perms = ['case-type:view', 'case-type:manage'];
    render(<CaseTypeBuilder />);
    expect(screen.getByText('New case type')).toBeTruthy();
    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.getByText('Archive')).toBeTruthy();
    expect(screen.queryByText('Publish')).toBeNull();
  });

  it('publish: Publish on DRAFT row', () => {
    perms = ['case-type:view', 'case-type:publish'];
    render(<CaseTypeBuilder />);
    expect(screen.getByText('Publish')).toBeTruthy();
    expect(screen.queryByText('New case type')).toBeNull();
  });
});
