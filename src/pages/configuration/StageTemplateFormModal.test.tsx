import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StageTemplateFormModal } from './StageTemplateFormModal';

const updateMutate = vi.fn();
vi.mock('../../hooks/useCaseTypes', () => ({
  useCreateStageTemplate: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateStageTemplate: () => ({ mutate: updateMutate, isPending: false }),
}));

const tpl = {
  id: 't1', caseTypeId: 'c1', key: 'kyc_check', label: 'KYC', sequence: 1, durationValue: 2, durationType: 'DAYS' as const,
  externalWaiting: false, bufferDays: null, dependsOnPrevious: false, enforceRequiredOnComplete: false,
  atRiskPercent: null, warnDaysRemaining: null, hardBlock: false, deletedAt: null,
};

describe('StageTemplateFormModal', () => {
  beforeEach(() => updateMutate.mockClear());

  it('edit: key is read-only and omitted from the update payload', async () => {
    render(<StageTemplateFormModal isOpen onClose={() => {}} caseTypeId="c1" template={tpl} />);
    const key = screen.getByLabelText('Key') as HTMLInputElement;
    expect(key.readOnly).toBe(true);
    expect(key.disabled).toBe(true);
    await waitFor(() => expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(updateMutate).toHaveBeenCalled());
    const arg = updateMutate.mock.calls[0][0];
    expect(arg).toMatchObject({ caseTypeId: 'c1', templateId: 't1' });
    expect(arg.payload).not.toHaveProperty('key');
    expect(arg.payload).toMatchObject({ label: 'KYC', durationValue: 2, durationType: 'DAYS' });
  });

  it('submit is disabled while invalid (empty label)', async () => {
    render(<StageTemplateFormModal isOpen onClose={() => {}} caseTypeId="c1" template={tpl} />);
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: '' } });
    await waitFor(() => expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(true));
  });
});
