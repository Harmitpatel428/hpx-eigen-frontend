import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldRenderer } from './FieldRenderer';
import type { CaseFieldWithRuntime } from '../../types/caseConfig';

vi.mock('../../hooks/useCaseFields', () => ({
  useCaseFieldOptions: () => ({
    data: [
      { id: 'o1', label: 'Alpha', isActive: true },
      { id: 'o2', label: 'Beta', isActive: true },
      { id: 'o3', label: 'Gamma', isActive: false },
    ],
  }),
}));

const mk = (type: string, extra: Partial<CaseFieldWithRuntime> = {}) =>
  ({ id: 'f1', name: 'My Field', type, isHidden: false, isApplicable: true, isRequired: false, ...extra }) as CaseFieldWithRuntime;
const r = (f: CaseFieldWithRuntime, value: unknown = null) =>
  render(<FieldRenderer field={f} value={value} onChange={() => {}} />);

describe('FieldRenderer', () => {
  it('TEXT -> text input', () => {
    r(mk('TEXT'));
    expect(screen.getByLabelText(/My Field/)).toHaveAttribute('type', 'text');
  });
  it('NUMBER -> number input', () => {
    r(mk('NUMBER'));
    expect(screen.getByLabelText(/My Field/)).toHaveAttribute('type', 'number');
  });
  it('BOOLEAN -> checkbox', () => {
    r(mk('BOOLEAN'));
    expect(screen.getByLabelText(/My Field/)).toHaveAttribute('type', 'checkbox');
  });
  it('SELECT renders options', () => {
    r(mk('SELECT'));
    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument();
  });
  it('MULTI_SELECT renders checked options', () => {
    r(mk('MULTI_SELECT'), ['o2']);
    expect(screen.getByLabelText('Beta')).toBeChecked();
    expect(screen.getByLabelText('Alpha')).not.toBeChecked();
  });
  it('keeps a selected inactive option', () => {
    r(mk('SELECT'), 'o3');
    expect(screen.getByRole('option', { name: 'Gamma (inactive)' })).toBeInTheDocument();
  });
  it('required shows asterisk', () => {
    r(mk('TEXT', { isRequired: true }));
    expect(screen.getByText('*')).toBeInTheDocument();
  });
  it('hidden renders nothing', () => {
    const { container } = r(mk('TEXT', { isHidden: true }));
    expect(container).toBeEmptyDOMElement();
  });
});
