import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CaseTypeFormModal } from './CaseTypeFormModal';

vi.mock('../../auth/public', () => ({ useAuth: () => ({ permissions: { can: () => true } }) }));
vi.mock('../../hooks/useCaseFields', () => ({ useCaseFields: () => ({ data: [] }) }));
vi.mock('../../hooks/useCaseTypes', () => {
  const mut = () => ({ mutate: vi.fn(), isPending: false });
  return {
    usePlacements: () => ({ data: [] }),
    useStageTemplates: () => ({ data: [] }),
    useCreateCaseType: mut, useUpdateCaseType: mut, useAddPlacement: mut, useUpdatePlacement: mut, useRemovePlacement: mut,
    useCreateStageTemplate: mut, useUpdateStageTemplate: mut, useArchiveStageTemplate: mut, useReorderStageTemplates: mut,
  };
});

const ct = (status: string) => ({ id: 'c1', key: 'loan_case', name: 'Loan case', description: null, status, displayOrder: 0 }) as never;

describe('CaseTypeFormModal stages', () => {
  it('create path: no stage editor', () => {
    render(<CaseTypeFormModal isOpen onClose={() => {}} />);
    expect(screen.queryByText('Stage templates')).toBeNull();
  });

  it('existing type: editor shown; archived => read-only', () => {
    const { unmount } = render(<CaseTypeFormModal isOpen onClose={() => {}} caseType={ct('DRAFT')} />);
    expect(screen.getByText('New stage')).toBeTruthy();
    unmount();
    render(<CaseTypeFormModal isOpen onClose={() => {}} caseType={ct('ARCHIVED')} />);
    expect(screen.getByText('Stage templates')).toBeTruthy();
    expect(screen.queryByText('New stage')).toBeNull();
  });

  it('Esc in the stage modal does not close the outer modal; Cancel closes the inner', () => {
    const onClose = vi.fn();
    render(<CaseTypeFormModal isOpen onClose={onClose} caseType={ct('DRAFT')} />);
    fireEvent.click(screen.getByText('New stage'));
    expect(screen.getByText('Create')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Edit case type')).toBeTruthy();
    expect(screen.getByText('Create')).toBeTruthy(); // inner still open
    fireEvent.click(screen.getAllByText('Cancel')[1]);
    expect(screen.queryByText('Create')).toBeNull();
    expect(screen.getByText('Edit case type')).toBeTruthy();
  });

  it('unmounting the outer modal while the stage modal is open releases body scroll', () => {
    const { unmount } = render(<CaseTypeFormModal isOpen onClose={() => {}} caseType={ct('DRAFT')} />);
    fireEvent.click(screen.getByText('New stage'));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
