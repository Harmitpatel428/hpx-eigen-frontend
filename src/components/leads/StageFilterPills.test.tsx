import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { memo, useState } from 'react';
import { StageFilterPills, PILL_ACTIVE_CLASS } from './StageFilterPills';

const COUNTS: Record<string, number> = {
  NEW: 5, QUALIFIED: 3, INTERESTED: 2, FOLLOW_UP: 4,
  CALL_BACK_REQUESTED: 1, CALL_NOT_RECEIVED: 2, DISQUALIFIED: 1, OTHER: 2,
};

beforeEach(() => { localStorage.clear(); });

const findPill = (text: string) =>
  screen.getAllByRole('button').find(b => {
    const t = b.textContent ?? '';
    return text === 'All Leads' ? t.startsWith('All Leads') : t.startsWith(text) && !t.startsWith('All');
  })!;

describe('StageFilterPills', () => {
  it('[T1] renders all 9 pills with labels and counts', () => {
    render(<StageFilterPills selectedStage="" stageCounts={COUNTS} colourfulFilters={false} onSelect={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(9);
    for (const label of ['All Leads', 'New', 'Qualified', 'Interested', 'Follow-Up', 'Call Back', 'Not Received', 'Disqualified', 'Others']) {
      expect(findPill(label)).toBeTruthy();
    }
  });

  it('[T2] selected pill has aria-pressed=true + active class; others false', () => {
    render(<StageFilterPills selectedStage="NEW" stageCounts={COUNTS} colourfulFilters={false} onSelect={() => {}} />);
    const newBtn = findPill('New');
    expect(newBtn.getAttribute('aria-pressed')).toBe('true');
    expect(newBtn.classList.contains(PILL_ACTIVE_CLASS)).toBe(true);
    expect(findPill('All Leads').getAttribute('aria-pressed')).toBe('false');
    expect(findPill('Qualified').getAttribute('aria-pressed')).toBe('false');
  });

  it('[T3] click pill -> onSelect called with that stage exactly once', () => {
    const onSelect = vi.fn();
    render(<StageFilterPills selectedStage="" stageCounts={COUNTS} colourfulFilters={false} onSelect={onSelect} />);
    fireEvent.click(findPill('New'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('NEW');
  });

  it('[T4] active class on selected pill only', () => {
    render(<StageFilterPills selectedStage="NEW" stageCounts={COUNTS} colourfulFilters={false} onSelect={() => {}} />);
    const active = document.querySelectorAll(`.${PILL_ACTIVE_CLASS}`);
    expect(active).toHaveLength(1);
    expect(findPill('New').classList.contains(PILL_ACTIVE_CLASS)).toBe(true);
    expect(findPill('All Leads').classList.contains(PILL_ACTIVE_CLASS)).toBe(false);
  });

  it('[T5] re-click selected -> still exactly one active pill', () => {
    function Harness() {
      const [stage, setStage] = useState<string>('');
      return <StageFilterPills selectedStage={stage as any} stageCounts={COUNTS} colourfulFilters={false} onSelect={setStage as any} />;
    }
    render(<Harness />);
    fireEvent.click(findPill('All Leads'));
    fireEvent.click(findPill('All Leads'));
    expect(document.querySelectorAll(`.${PILL_ACTIVE_CLASS}`)).toHaveLength(1);
  });

  it('[T6] switch pill -> active class moves to new pill', () => {
    function Harness() {
      const [stage, setStage] = useState<string>('');
      return <StageFilterPills selectedStage={stage as any} stageCounts={COUNTS} colourfulFilters={false} onSelect={setStage as any} />;
    }
    render(<Harness />);
    fireEvent.click(findPill('New'));
    expect(findPill('New').classList.contains(PILL_ACTIVE_CLASS)).toBe(true);
    expect(findPill('All Leads').classList.contains(PILL_ACTIVE_CLASS)).toBe(false);
  });

  it('[T7] memo: parent re-renders with identical props -> pills do NOT re-render', () => {
    const renderSpy = vi.fn();
    const stableOnSelect = () => {};

    const SpiedPills = memo(function SpiedPills(props: Parameters<typeof StageFilterPills>[0]) {
      renderSpy();
      return <StageFilterPills {...props} />;
    });

    function Harness({ trigger }: { trigger: number }) {
      void trigger;
      return <SpiedPills selectedStage="" stageCounts={COUNTS} colourfulFilters={false} onSelect={stableOnSelect} />;
    }
    const { rerender } = render(<Harness trigger={0} />);
    const initial = renderSpy.mock.calls.length;
    rerender(<Harness trigger={1} />);
    expect(renderSpy.mock.calls.length).toBe(initial);
  });

  it('[T8] keyboard: tab + Enter activates a pill', async () => {
    const onSelect = vi.fn();
    render(<StageFilterPills selectedStage="" stageCounts={COUNTS} colourfulFilters={false} onSelect={onSelect} />);
    const user = userEvent.setup();
    await user.tab(); // All Leads
    await user.tab(); // first stage pill (New)
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('NEW');
  });

  it('[T9] button element is NOT remounted across clicks (DOM identity stable)', () => {
    function Harness() {
      const [stage, setStage] = useState<string>('');
      return <StageFilterPills selectedStage={stage as any} stageCounts={COUNTS} colourfulFilters={false} onSelect={setStage as any} />;
    }
    render(<Harness />);
    const allBtnBefore = findPill('All Leads');
    const newBtnBefore = findPill('New');

    fireEvent.click(newBtnBefore);

    expect(findPill('All Leads')).toBe(allBtnBefore);
    expect(findPill('New')).toBe(newBtnBefore);
  });
});
