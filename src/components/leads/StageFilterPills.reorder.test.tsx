import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StageFilterPills } from './StageFilterPills';

const COUNTS: Record<string, number> = {
  NEW: 5, QUALIFIED: 3, INTERESTED: 2, FOLLOW_UP: 4,
  CALL_BACK_REQUESTED: 1, CALL_NOT_RECEIVED: 2, DISQUALIFIED: 1, OTHER: 2,
};

beforeEach(() => { localStorage.clear(); });

const stagePills = () =>
  screen.getAllByRole('button').filter(b => !b.textContent?.startsWith('All'));

const labelOf = (btn: HTMLElement) =>
  btn.textContent?.replace(/\d/g, '').trim() ?? '';

function renderDefault(onSelect = vi.fn()) {
  return { onSelect, ...render(
    <StageFilterPills selectedStage="" stageCounts={COUNTS} colourfulFilters={false} onSelect={onSelect} />
  )};
}

function dndPillOnto(source: HTMLElement, target: HTMLElement) {
  fireEvent.dragStart(source);
  fireEvent.dragOver(target);
  fireEvent.drop(target);
}

describe('StageFilterPills reorder', () => {
  it('[R1] drag pill onto another -> localStorage persisted with new order', () => {
    renderDefault();
    const pills = stagePills();
    const [first, , third] = pills;
    expect(labelOf(first)).toBe('New');
    expect(labelOf(third)).toBe('Interested');

    dndPillOnto(first, third);

    const stored = JSON.parse(localStorage.getItem('sales_dashboard_stage_order')!);
    expect(stored[0]).not.toBe('NEW');
    expect(stored).toContain('NEW');
    expect(stored).toHaveLength(8);
  });

  it('[R2] pre-seeded localStorage order renders pills in that order', () => {
    localStorage.setItem(
      'sales_dashboard_stage_order',
      JSON.stringify(['FOLLOW_UP', 'NEW', 'QUALIFIED', 'INTERESTED', 'CALL_BACK_REQUESTED', 'CALL_NOT_RECEIVED', 'DISQUALIFIED', 'OTHER']),
    );
    renderDefault();
    const pills = stagePills();
    expect(labelOf(pills[0])).toBe('Follow-Up');
    expect(labelOf(pills[1])).toBe('New');
    expect(labelOf(pills[2])).toBe('Qualified');
  });

  it('[R3] drag reorder does NOT fire onSelect', () => {
    const { onSelect } = renderDefault();
    const pills = stagePills();
    dndPillOnto(pills[0], pills[2]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('[R4] dragStart without drop -> order unchanged, nothing persisted', () => {
    renderDefault();
    const pills = stagePills();
    const orderBefore = pills.map(labelOf);

    fireEvent.dragStart(pills[0]);
    fireEvent.dragEnd(pills[0]);

    const orderAfter = stagePills().map(labelOf);
    expect(orderAfter).toEqual(orderBefore);
    expect(localStorage.getItem('sales_dashboard_stage_order')).toBeNull();
  });

  it('[R5] keyboard ArrowRight reorders and persists', async () => {
    renderDefault();
    const pills = stagePills();
    expect(labelOf(pills[0])).toBe('New');
    expect(labelOf(pills[1])).toBe('Qualified');

    pills[0].focus();
    await userEvent.keyboard('{ArrowRight}');

    const reordered = stagePills();
    expect(labelOf(reordered[0])).toBe('Qualified');
    expect(labelOf(reordered[1])).toBe('New');
    const stored = JSON.parse(localStorage.getItem('sales_dashboard_stage_order')!);
    expect(stored[0]).toBe('QUALIFIED');
    expect(stored[1]).toBe('NEW');
  });

  it('[R6] drop with throwing setItem -> no exception, in-memory order intact', () => {
    renderDefault();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
    const pills = stagePills();

    expect(() => dndPillOnto(pills[0], pills[2])).not.toThrow();

    const labels = stagePills().map(labelOf);
    expect(labels).toContain('New');
    expect(labels).toHaveLength(8);
    spy.mockRestore();
  });

  it('[R7] after throwing drop, next drag cycle still works (dragIdx reset)', () => {
    renderDefault();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
    const pills = stagePills();
    dndPillOnto(pills[0], pills[2]);
    spy.mockRestore();

    const pills2 = stagePills();
    expect(() => dndPillOnto(pills2[0], pills2[1])).not.toThrow();
    expect(localStorage.getItem('sales_dashboard_stage_order')).not.toBeNull();
  });

  it('[R8] keyboard ArrowRight with throwing setItem -> no exception', async () => {
    renderDefault();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
    const pills = stagePills();
    pills[0].focus();

    await expect(userEvent.keyboard('{ArrowRight}')).resolves.not.toThrow();

    const reordered = stagePills();
    expect(labelOf(reordered[0])).toBe('Qualified');
    expect(labelOf(reordered[1])).toBe('New');
    spy.mockRestore();
  });
});
