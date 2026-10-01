import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldsTab } from './FieldsTab';

let granted: string[] = [];
const ISO = '2026-03-05T10:30:00.000Z';
let extraField: Record<string, unknown> | null = null;
let noApplicable = false;

vi.mock('../../auth/public', () => ({
  useAuth: () => ({ permissions: { can: (s: string) => granted.includes(s) } }),
}));
vi.mock('../../hooks/useCaseFields', () => ({ useCaseFieldOptions: () => ({ data: [] }) }));
vi.mock('../../hooks/useCaseWorkspace', () => ({
  useCaseFieldValues: () => ({
    isLoading: false,
    refetch: vi.fn(),
    data: {
      fields: [
        ...(extraField ? [extraField] : []),
        { id: 'f1', name: 'Title', type: 'TEXT', isHidden: false, isApplicable: !noApplicable, isRequired: true, defaultValue: null },
        { id: 'f2', name: 'Secret', type: 'TEXT', isHidden: false, isApplicable: false, isRequired: false, defaultValue: null },
      ],
      values: [{ id: 'v2', fieldId: 'dt', valueDate: ISO, version: 1, selections: [] }, { id: 'v1', fieldId: 'f1', valueText: 'hello', version: 1, selections: [] }],
    },
  }),
  usePatchFieldValues: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('FieldsTab', () => {
  beforeEach(() => { granted = []; extraField = null; noApplicable = false; });

  it('doc:view only -> disabled inputs, no Save', () => {
    granted = ['doc:view'];
    render(<FieldsTab caseId="c1" />);
    expect(screen.getByLabelText(/Title/)).toBeDisabled();
    expect(screen.getByLabelText(/Title/)).toHaveValue('hello');
    expect(screen.queryByText('Secret')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('no applicable fields -> prompt, no Save', () => {
    granted = ['doc:view', 'doc:edit'];
    noApplicable = true;
    render(<FieldsTab caseId="c1" />);
    expect(screen.getByText(/No fields on this case type yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('doc:edit -> Save present, inputs enabled', () => {
    granted = ['doc:view', 'doc:edit'];
    render(<FieldsTab caseId="c1" />);
    expect(screen.getByLabelText(/Title/)).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('DATETIME displays local time and round-trips to the same instant', () => {
    granted = ['doc:view'];
    extraField = { id: 'dt', name: 'When', type: 'DATETIME', isHidden: false, isApplicable: true, isRequired: false, defaultValue: null };
    render(<FieldsTab caseId="c1" />);
    const v = (screen.getByLabelText(/When/) as HTMLInputElement).value;
    expect(new Date(v).toISOString()).toBe(ISO);
  });

  it('MULTI_SELECT with non-array default does not crash', () => {
    granted = ['doc:view'];
    extraField = { id: 'ms', name: 'Tags', type: 'MULTI_SELECT', isHidden: false, isApplicable: true, isRequired: false, defaultValue: 'oops' };
    render(<FieldsTab caseId="c1" />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });
});
