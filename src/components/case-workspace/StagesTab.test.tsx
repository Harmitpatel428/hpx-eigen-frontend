import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StagesTab } from './StagesTab';

let granted: string[] = [];
let status = 'IN_PROGRESS';
let timeline: Record<string, unknown> | null = null;
let noStages = false;
let loading = false;
let templates: unknown[] = [];
const createMutate = vi.fn();
const m = { setTarget: vi.fn(), approve: vi.fn(), pause: vi.fn(), resume: vi.fn(), reopen: vi.fn(), skip: vi.fn(), dur: vi.fn() };
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
    isLoading: loading,
    data: {
      timeline,
      stages: noStages ? [] : [{ id: 's1', key: 'k1', label: 'Stage One', sequence: 1, status, slaState: 'AT_RISK', plannedStart: null, plannedFinish: null, latestFinish: null }],
    },
  }),
  useCreateTimeline: () => ({ mutate: createMutate, isPending: false }),
  useCaseForecast: () => ({ data: { projectedCompletion: null, stages: [] } }),
  useStartStage: () => ({ mutate: vi.fn() }),
  useCompleteStage: () => ({ mutate: completeMutate }),
  useUnlockStage: () => ({ mutate: vi.fn() }),
  useSetTarget: () => ({ mutate: m.setTarget }),
  useApproveException: () => ({ mutate: m.approve }),
  usePauseStage: () => ({ mutate: m.pause }),
  useResumeStage: () => ({ mutate: m.resume }),
  useReopenStage: () => ({ mutate: m.reopen }),
  useSkipStage: () => ({ mutate: m.skip }),
  useOverrideDuration: () => ({ mutate: m.dur }),
}));

vi.mock('../../hooks/useCaseTypes', () => ({ useStageTemplates: () => ({ data: templates, isLoading: loading }) }));

beforeEach(() => { loading = false; noStages = false; templates = []; createMutate.mockReset(); timeline = null; Object.values(m).forEach((f) => f.mockReset()); granted = []; status = 'IN_PROGRESS'; completeMutate.mockReset(); validate.mockReset(); });

describe('StagesTab', () => {
  it('no timeline + templates: Create timeline shown for case-timeline:manage and fires', async () => {
    noStages = true; templates = [{ id: 'x' }]; granted = ['case-timeline:manage'];
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Create timeline' }));
    expect(createMutate).toHaveBeenCalled();
  });

  it('no timeline + templates without manage perm: button hidden', () => {
    noStages = true; templates = [{ id: 'x' }];
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    expect(screen.queryByRole('button', { name: 'Create timeline' })).toBeNull();
    expect(screen.getByText('No timeline yet.')).toBeInTheDocument();
  });

  it('loading: neither hint nor Create timeline, shows Loading', () => {
    noStages = true; loading = true; granted = ['case-timeline:manage'];
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText(/no stage templates yet/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create timeline' })).toBeNull();
  });

  it('no timeline + no templates: hint, no button', () => {
    noStages = true; granted = ['case-timeline:manage'];
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    expect(screen.getByText('This case type has no stage templates yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create timeline' })).toBeNull();
  });

  it('BLOCKED stage shows banner; Unlock only with sla:unlock', () => {
    status = 'BLOCKED';
    const { unmount } = render(<StagesTab caseId="c1" caseTypeId="t1" />);
    expect(screen.getByText(/must be unlocked/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unlock' })).toBeNull();
    unmount();
    granted = ['sla:unlock'];
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
  });

  it('invalid validation blocks complete', async () => {
    granted = ['case-stage:complete'];
    validate.mockResolvedValue({ valid: false, missing: [{ fieldId: 'a' }] });
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Complete' }));
    expect(await screen.findByText(/1 required field/)).toBeInTheDocument();
    expect(completeMutate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Override/ })).toBeNull();
  });

  it('validate failure toasts and does not complete', async () => {
    granted = ['case-stage:complete'];
    validate.mockRejectedValue({ response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'Server error.' } } });
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Complete' }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Server error.'));
    expect(completeMutate).not.toHaveBeenCalled();
  });

  it('valid validation completes', async () => {
    granted = ['case-stage:complete'];
    validate.mockResolvedValue({ valid: true, missing: [] });
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Complete' }));
    await waitFor(() => expect(completeMutate).toHaveBeenCalledWith({ stageId: 's1' }));
  });

  const ALL = ['case-stage:pause', 'case-stage:resume', 'case-stage:skip', 'case-stage:reopen', 'case-stage:override'];
  const has = (n: string) => screen.queryByRole('button', { name: n }) !== null;

  it.each([
    ['IN_PROGRESS', ['Pause', 'Skip', 'Override duration'], ['Resume', 'Reopen']],
    ['WAITING_EXTERNAL', ['Resume', 'Skip', 'Override duration'], ['Pause', 'Reopen']],
    ['READY', ['Skip', 'Override duration'], ['Pause', 'Resume', 'Reopen']],
    ['COMPLETED', ['Reopen'], ['Skip', 'Pause', 'Resume', 'Override duration']],
    ['SKIPPED', ['Reopen'], ['Skip', 'Pause']],
    ['BLOCKED', [], ['Pause', 'Skip', 'Reopen', 'Override duration']],
  ])('%s action visibility', (st, shown, hidden) => {
    status = st; granted = ALL;
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    shown.forEach((n) => expect(has(n)).toBe(true));
    hidden.forEach((n) => expect(has(n)).toBe(false));
  });

  it('no-reason actions call hooks with stageId', async () => {
    granted = ALL;
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(m.pause).toHaveBeenCalledWith({ stageId: 's1' });
  });

  it('Skip dialog requires a reason', async () => {
    granted = ALL;
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Reason'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(m.skip).toHaveBeenCalledWith({ stageId: 's1', reason: 'nope' });
  });

  it('Override duration requires valid days and reason', async () => {
    granted = ALL;
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Override duration' }));
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    await userEvent.type(screen.getByLabelText('Reason'), 'why');
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Remaining days'), '-1');
    expect(confirm).toBeDisabled();
    await userEvent.clear(screen.getByLabelText('Remaining days'));
    await userEvent.type(screen.getByLabelText('Remaining days'), '3');
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(m.dur).toHaveBeenCalledWith({ stageId: 's1', remainingDuration: 3, reason: 'why' });
  });

  it('Set target sends date; Clear sends null; gated', async () => {
    timeline = { targetDate: null, feasible: null, deficitDays: null, exceptionApproved: false };
    const { unmount } = render(<StagesTab caseId="c1" caseTypeId="t1" />);
    expect(has('Set target')).toBe(false);
    unmount();
    granted = ['case-timeline:manage'];
    const r = render(<StagesTab caseId="c1" caseTypeId="t1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Set target' }));
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Target date'), '2026-12-01');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(m.setTarget).toHaveBeenCalledWith('2026-12-01');
    r.unmount();
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Set target' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(m.setTarget).toHaveBeenLastCalledWith(null);
  });

  it('Approve exception gating', async () => {
    granted = ['case-exception:approve'];
    const tl = (o: object) => ({ targetDate: '2026-12-01', feasible: false, deficitDays: 4, exceptionApproved: false, ...o });
    timeline = tl({ feasible: true });
    let r = render(<StagesTab caseId="c1" caseTypeId="t1" />);
    expect(has('Approve exception')).toBe(false);
    r.unmount();
    timeline = tl({ exceptionApproved: true });
    r = render(<StagesTab caseId="c1" caseTypeId="t1" />);
    expect(has('Approve exception')).toBe(false);
    expect(screen.getByText('Exception approved')).toBeInTheDocument();
    r.unmount();
    timeline = tl({});
    r = render(<StagesTab caseId="c1" caseTypeId="t1" />);
    expect(screen.getByText(/Infeasible — 4 days short/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Approve exception' }));
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Reason'), 'ok');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(m.approve).toHaveBeenCalledWith('ok');
    r.unmount();
    granted = [];
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    expect(has('Approve exception')).toBe(false);
  });

  it('403 error surfaces message via toast', async () => {
    granted = ['case-stage:complete'];
    validate.mockRejectedValue({ response: { status: 403, data: { code: 'FORBIDDEN', message: 'Not allowed.' } } });
    render(<StagesTab caseId="c1" caseTypeId="t1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Complete' }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Not allowed.'));
  });
});
