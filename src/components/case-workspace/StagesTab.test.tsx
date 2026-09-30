import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StagesTab } from './StagesTab';

let granted: string[] = [];
let status = 'IN_PROGRESS';
const completeMutate = vi.fn();
const validate = vi.fn();
const toastError = vi.fn();

vi.mock('sonner', () => ({ toast: { error: (m: string) => toastError(m) } }));

vi.mock('../../auth/public', () => ({
  useAuth: () => ({ permissions: { can: (s: string) => granted.includes(s) } }),
}));
vi.mock('../../services/case-workspace.service', () => ({
  caseWorkspaceService: { validateFieldValues: (...a: unknown[]) => validate(...a) },
}));
vi.mock('../../hooks/useCaseWorkspace', () => ({
  useCaseTimeline: () => ({
    data: {
      timeline: null,
      stages: [{ id: 's1', key: 'k1', label: 'Stage One', sequence: 1, status, slaState: 'AT_RISK', plannedStart: null, plannedFinish: null, latestFinish: null }],
    },
  }),
  useCaseForecast: () => ({ data: { projectedCompletion: null, stages: [] } }),
  useStartStage: () => ({ mutate: vi.fn() }),
  useCompleteStage: () => ({ mutate: completeMutate }),
  useUnlockStage: () => ({ mutate: vi.fn() }),
}));

beforeEach(() => { granted = []; status = 'IN_PROGRESS'; completeMutate.mockReset(); validate.mockReset(); });

describe('StagesTab', () => {
  it('BLOCKED stage shows banner; Unlock only with sla:unlock', () => {
    status = 'BLOCKED';
    const { unmount } = render(<StagesTab caseId="c1" />);
    expect(screen.getByText(/must be unlocked/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unlock' })).toBeNull();
    unmount();
    granted = ['sla:unlock'];
    render(<StagesTab caseId="c1" />);
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
  });

  it('invalid validation blocks complete', async () => {
    granted = ['case-stage:complete'];
    validate.mockResolvedValue({ valid: false, missing: [{ fieldId: 'a' }] });
    render(<StagesTab caseId="c1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Complete' }));
    expect(await screen.findByText(/1 required field/)).toBeInTheDocument();
    expect(completeMutate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Override/ })).toBeNull();
  });

  it('validate failure toasts and does not complete', async () => {
    granted = ['case-stage:complete'];
    validate.mockRejectedValue({ response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'Server error.' } } });
    render(<StagesTab caseId="c1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Complete' }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Server error.'));
    expect(completeMutate).not.toHaveBeenCalled();
  });

  it('valid validation completes', async () => {
    granted = ['case-stage:complete'];
    validate.mockResolvedValue({ valid: true, missing: [] });
    render(<StagesTab caseId="c1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Complete' }));
    await waitFor(() => expect(completeMutate).toHaveBeenCalledWith({ stageId: 's1' }));
  });
});
