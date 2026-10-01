import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleBuilder } from './RuleBuilder';

let perms: string[] = [];
let empty = false;
const createAsync = vi.fn();
vi.mock('../../auth/public', () => ({ useAuth: () => ({ permissions: { can: (p: string) => perms.includes(p) } }) }));
vi.mock('../../hooks/useCaseFields', () => ({
  useCaseFields: () => ({
    data: [
      { id: 'f1', name: 'Amount', type: 'NUMBER', status: 'ACTIVE' },
      { id: 'f2', name: 'Notes', type: 'TEXT', status: 'ACTIVE' },
      { id: 'f3', name: 'Tags', type: 'MULTI_SELECT', status: 'ACTIVE' },
    ],
    isLoading: false,
  }),
  useCaseFieldOptions: (id: string | null) => ({ data: id ? [{ id: 'o1', label: 'Alpha', isActive: true }] : [] }),
}));
vi.mock('../../hooks/useCaseFieldRules', () => {
  const mut = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return {
    useCaseFieldRules: () => ({
      isLoading: false,
      data: empty ? [] : [{ id: 'r1', name: 'Big amount', isActive: true, priority: 0, conditionFieldId: 'f1', conditionOperator: 'GREATER_THAN', conditionValue: 5, conditionOptionId: null, effectType: 'REQUIRE_FIELD', targetFieldId: 'f2', defaultPayload: null, deletedAt: null }],
    }),
    useCreateRule: () => ({ mutate: vi.fn(), mutateAsync: createAsync, isPending: false }),
    useUpdateRule: mut, useArchiveRule: mut,
  };
});

describe('RuleBuilder', () => {
  beforeEach(() => { empty = false; perms = []; createAsync.mockReset(); });

  it('view-only: no controls', () => {
    perms = ['case-field:view'];
    render(<RuleBuilder />);
    expect(screen.getByText('Big amount')).toBeTruthy();
    for (const t of ['New rule', 'Edit', 'Archive']) expect(screen.queryByText(t)).toBeNull();
  });

  it('manage: New/Edit/Archive present', () => {
    perms = ['case-field:view', 'case-field:manage'];
    render(<RuleBuilder />);
    for (const t of ['New rule', 'Edit', 'Archive']) expect(screen.getByText(t)).toBeTruthy();
  });

  it('surfaces the 422 cycle error inline and keeps the modal open', async () => {
    perms = ['case-field:view', 'case-field:manage'];
    createAsync.mockRejectedValue({ response: { status: 422, data: { code: 'BUSINESS_RULE_VIOLATION', message: 'Rule dependency cycle detected.' } } });
    const user = userEvent.setup();
    render(<RuleBuilder />);
    await user.click(screen.getByText('New rule'));
    await user.type(screen.getByLabelText('Name'), 'Loop');
    await user.selectOptions(screen.getByLabelText('When field'), 'f2');
    await user.selectOptions(screen.getByLabelText('Operator'), 'IS_EMPTY');
    await user.selectOptions(screen.getByLabelText('Target field'), 'f1');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByTestId('rule-form-error').textContent).toBe('Rule dependency cycle detected.'));
    expect(screen.getByLabelText('Name')).toBeTruthy();
  });

  it('resets operator to a valid one when condition field changes', async () => {
    perms = ['case-field:view', 'case-field:manage'];
    createAsync.mockResolvedValue({});
    const user = userEvent.setup();
    render(<RuleBuilder />);
    await user.click(screen.getByText('New rule'));
    await user.type(screen.getByLabelText('Name'), 'x');
    await user.selectOptions(screen.getByLabelText('When field'), 'f3');
    await user.selectOptions(screen.getByLabelText('Value'), 'o1');
    await user.selectOptions(screen.getByLabelText('Target field'), 'f2');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(createAsync).toHaveBeenCalled());
    expect(createAsync.mock.calls[0][0]).toMatchObject({ conditionOperator: 'IN', conditionOptionId: 'o1' });
  });

  it('empty list shows the setup chain', () => {
    empty = true;
    render(<RuleBuilder />);
    expect(screen.getByText(/Create field → Activate → place on a case type → Publish → assign to a case/)).toBeTruthy();
  });
});
