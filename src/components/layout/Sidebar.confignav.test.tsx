import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

let granted: string[] = [];
let flag = false;

vi.mock('../../auth/public', () => ({
  useAuth: () => ({
    permissions: {
      can: (s: string) => granted.includes(s),
      canAny: (s: string[]) => s.some(x => granted.includes(x)),
    },
  }),
}));
vi.mock('../../hooks/useCaseFields', () => ({
  useCaseEngineSettings: () => ({ data: { caseOperationsEngineEnabled: flag } }),
}));
vi.mock('../../context/DepartmentContext', () => ({
  useDepartment: () => ({ activeDepartment: null }),
}));

const renderSidebar = () =>
  render(<MemoryRouter><Sidebar /></MemoryRouter>);

describe('Sidebar Configuration link', () => {
  beforeEach(() => { granted = []; flag = false; });

  it('shows for case-engine:manage even with flag off', () => {
    granted = ['case-engine:manage'];
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Configuration' }).getAttribute('href')).toBe('/configuration');
  });

  it('shows when flag on + case-field:view', () => {
    granted = ['case-field:view']; flag = true;
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Configuration' })).toBeTruthy();
  });

  it('is absent when flag off + only case-field:view', () => {
    granted = ['case-field:view'];
    renderSidebar();
    expect(screen.queryByRole('link', { name: 'Configuration' })).toBeNull();
  });
});
