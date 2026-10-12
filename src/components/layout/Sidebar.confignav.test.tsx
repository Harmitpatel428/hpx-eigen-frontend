import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

// Reports & Configuration were relocated to the Settings page. The sidebar must
// no longer render them, so no duplicate navigation entries exist.
vi.mock('../../context/DepartmentContext', () => ({
  useDepartment: () => ({ activeDepartment: null }),
}));

const renderSidebar = () => render(<MemoryRouter><Sidebar /></MemoryRouter>);

describe('Sidebar — relocated config nav', () => {
  it('does not render a Reports link', () => {
    renderSidebar();
    expect(screen.queryByRole('link', { name: 'Reports' })).toBeNull();
  });

  it('does not render a Configuration link', () => {
    renderSidebar();
    expect(screen.queryByRole('link', { name: 'Configuration' })).toBeNull();
  });

  it('still renders Settings', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('href')).toBe('/settings');
  });
});
