import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReportsPage } from './ReportsPage';
import { exportCSV } from '../utils/csv';

vi.mock('../utils/csv', () => ({ exportCSV: vi.fn() }));
let granted = ['doc:view', 'case-timeline:view'];
let engineEnabled = true;
vi.mock('../auth/public', () => ({ useAuth: () => ({ permissions: { can: (s: string) => granted.includes(s) } }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('../components/reports/CaseFieldFilterBar', () => ({ CaseFieldFilterBar: () => <div>filterbar</div> }));
vi.mock('../hooks/useCaseFields', () => ({
  useCaseFields: () => ({ data: [{ id: 'f1', name: 'Stage', type: 'SELECT', reportable: true }] }),
  useCaseEngineSettings: () => ({ data: { caseOperationsEngineEnabled: engineEnabled }, isLoading: false }),
}));
vi.mock('../hooks/useCaseReports', () => ({
  useOverdueByStage: () => ({ data: [{ stageKey: 'INTAKE', overdue: 3, atRisk: 2 }] }),
  useOnTimeVsLate: () => ({ data: { onTime: 10, late: 4 } }),
  useCasesByOption: () => ({ data: [{ optionId: 'o1', label: 'Alpha', count: 6 }] }),
  useCaseList: () => ({ isLoading: false, data: { data: [{ id: 'c1', caseNumber: 'HPX-1', status: 'OPEN', priority: 1, completionPercent: 50, createdAt: '2026-01-01' }] } }),
}));

describe('ReportsPage', () => {
  beforeEach(() => { granted = ['doc:view', 'case-timeline:view']; engineEnabled = true; });

  it('renders the report cards and case list', () => {
    render(<ReportsPage />);
    expect(screen.getByText('INTAKE')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('Alpha:')).toBeTruthy();
    expect(screen.getByText('HPX-1')).toBeTruthy();
  });

  it('redirects away (renders nothing) when the engine is disabled', () => {
    engineEnabled = false;
    render(<MemoryRouter><ReportsPage /></MemoryRouter>);
    expect(screen.queryByText('Reports')).toBeNull();
    expect(screen.queryByText('Alpha:')).toBeNull();
  });

  it('hides SLA cards without case-timeline:view', () => {
    granted = ['doc:view'];
    render(<ReportsPage />);
    expect(screen.queryByText('INTAKE')).toBeNull();
    expect(screen.queryByText('On time vs late')).toBeNull();
    expect(screen.getByText('Alpha:')).toBeTruthy();
  });

  it('exports the current rows as CSV', () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByText('Export CSV'));
    expect(exportCSV).toHaveBeenCalledWith('cases', expect.any(Array), [expect.objectContaining({ id: 'c1' })]);
  });
});
