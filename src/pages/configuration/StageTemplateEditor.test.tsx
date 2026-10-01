import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StageTemplateEditor } from './StageTemplateEditor';

let perms: string[] = [];
const reorder = vi.fn();
const archive = vi.fn();
vi.mock('../../auth/public', () => ({ useAuth: () => ({ permissions: { can: (p: string) => perms.includes(p) } }) }));
vi.mock('./StageTemplateFormModal', () => ({ StageTemplateFormModal: () => null }));
const t = (id: string, label: string, sequence: number) => ({
  id, caseTypeId: 'c1', key: label.toLowerCase(), label, sequence, durationValue: 2, durationType: 'DAYS',
  externalWaiting: false, bufferDays: null, dependsOnPrevious: false, enforceRequiredOnComplete: false,
  atRiskPercent: null, warnDaysRemaining: null, hardBlock: false, deletedAt: null,
});
vi.mock('../../hooks/useCaseTypes', () => ({
  useStageTemplates: () => ({ data: [t('b', 'Beta', 2), t('a', 'Alpha', 1), t('c', 'Gamma', 3)] }),
  useReorderStageTemplates: () => ({ mutate: reorder }),
  useArchiveStageTemplate: () => ({ mutate: archive }),
}));

describe('StageTemplateEditor', () => {
  beforeEach(() => { perms = ['case-timeline:view', 'case-timeline:manage']; reorder.mockClear(); archive.mockClear(); });

  it('lists templates by sequence', () => {
    render(<StageTemplateEditor caseTypeId="c1" />);
    const text = document.body.textContent!;
    expect(text.indexOf('Alpha')).toBeLessThan(text.indexOf('Beta'));
    expect(text.indexOf('Beta')).toBeLessThan(text.indexOf('Gamma'));
  });

  it('reorder Up/Down sends new orderedIds', () => {
    render(<StageTemplateEditor caseTypeId="c1" />);
    fireEvent.click(screen.getByLabelText('Move Beta up'));
    expect(reorder).toHaveBeenLastCalledWith({ caseTypeId: 'c1', orderedIds: ['b', 'a', 'c'] });
    fireEvent.click(screen.getByLabelText('Move Beta down'));
    expect(reorder).toHaveBeenLastCalledWith({ caseTypeId: 'c1', orderedIds: ['a', 'c', 'b'] });
  });

  it('archive confirms then archives', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<StageTemplateEditor caseTypeId="c1" />);
    fireEvent.click(screen.getByLabelText('Archive Beta'));
    expect(archive).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Archive Beta'));
    expect(archive).toHaveBeenCalledWith({ caseTypeId: 'c1', templateId: 'b' });
    confirm.mockRestore();
  });

  const hidden = () => {
    expect(screen.getByText(/Alpha/)).toBeTruthy();
    for (const t of ['New stage', 'Edit', 'Archive', 'Up', 'Down']) expect(screen.queryByText(t)).toBeNull();
  };
  it('no manage permission: read-only', () => {
    perms = ['case-timeline:view'];
    render(<StageTemplateEditor caseTypeId="c1" />);
    hidden();
  });
  it('archived type (disabled): read-only', () => {
    render(<StageTemplateEditor caseTypeId="c1" disabled />);
    hidden();
  });
});
