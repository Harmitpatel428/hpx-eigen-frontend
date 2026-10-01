import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CaseFieldFilterBar } from './CaseFieldFilterBar';

vi.mock('../../hooks/useCaseFields', () => ({
  useCaseFields: () => ({ data: [
    { id: 'f1', name: 'Stage', type: 'SELECT', filterable: true },
    { id: 'f2', name: 'Amount', type: 'NUMBER', filterable: true },
    { id: 'f4', name: 'Tags', type: 'MULTI_SELECT', filterable: true },
    { id: 'f5', name: 'Active', type: 'BOOLEAN', filterable: true },
    { id: 'f3', name: 'Hidden', type: 'TEXT', filterable: false },
  ] }),
  useCaseFieldOptions: () => ({ data: [{ id: 'o1', label: 'Alpha' }] }),
}));

const ops = () => Array.from((screen.getByLabelText('Filter operator') as HTMLSelectElement).options).map((o) => o.value);

describe('CaseFieldFilterBar', () => {
  it('lists only filterable fields', () => {
    render(<CaseFieldFilterBar value={[]} onChange={() => {}} />);
    expect(screen.getByRole('option', { name: 'Stage' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Hidden' })).toBeNull();
  });

  it('filters operators by type and emits encoded values', () => {
    const onChange = vi.fn();
    render(<CaseFieldFilterBar value={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Filter field'), { target: { value: 'f2' } });
    expect(ops()).toContain('GREATER_THAN');
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: '7' } });
    fireEvent.click(screen.getByText('Add filter'));
    expect(onChange).toHaveBeenLastCalledWith([{ fieldId: 'f2', operator: 'EQUALS', value: 7 }]);

    fireEvent.change(screen.getByLabelText('Filter field'), { target: { value: 'f1' } });
    expect(ops()).not.toContain('GREATER_THAN');
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: 'o1' } });
    fireEvent.click(screen.getByText('Add filter'));
    expect(onChange).toHaveBeenLastCalledWith([{ fieldId: 'f1', operator: 'EQUALS', value: 'o1' }]);
  });

  it('encodes MULTI_SELECT IN as an array', () => {
    const onChange = vi.fn();
    render(<CaseFieldFilterBar value={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Filter field'), { target: { value: 'f4' } });
    fireEvent.change(screen.getByLabelText('Filter operator'), { target: { value: 'IN' } });
    const sel = screen.getByLabelText('Filter values') as HTMLSelectElement;
    (Array.from(sel.options).find((o) => o.value === 'o1') as HTMLOptionElement).selected = true;
    fireEvent.change(sel);
    fireEvent.click(screen.getByText('Add filter'));
    expect(onChange).toHaveBeenLastCalledWith([{ fieldId: 'f4', operator: 'IN', value: ['o1'] }]);
  });

  it('encodes BOOLEAN as a real boolean', () => {
    const onChange = vi.fn();
    render(<CaseFieldFilterBar value={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Filter field'), { target: { value: 'f5' } });
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: 'true' } });
    fireEvent.click(screen.getByText('Add filter'));
    expect(onChange).toHaveBeenLastCalledWith([{ fieldId: 'f5', operator: 'EQUALS', value: true }]);
  });

  it('omits value for IS_EMPTY', () => {
    const onChange = vi.fn();
    render(<CaseFieldFilterBar value={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Filter field'), { target: { value: 'f2' } });
    fireEvent.change(screen.getByLabelText('Filter operator'), { target: { value: 'IS_EMPTY' } });
    fireEvent.click(screen.getByText('Add filter'));
    expect(onChange).toHaveBeenLastCalledWith([{ fieldId: 'f2', operator: 'IS_EMPTY' }]);
  });

  it('disables add at the 5-filter cap', () => {
    const five = Array.from({ length: 5 }, () => ({ fieldId: 'f2', operator: 'IS_EMPTY' as const }));
    render(<CaseFieldFilterBar value={five} onChange={() => {}} />);
    fireEvent.change(screen.getByLabelText('Filter field'), { target: { value: 'f2' } });
    fireEvent.change(screen.getByLabelText('Filter operator'), { target: { value: 'IS_EMPTY' } });
    expect((screen.getByText('Add filter').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
