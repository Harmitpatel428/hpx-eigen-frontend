import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

// Reports & Configuration were relocated to the Settings page. The sidebar must
// no longer render them, so no duplicate navigation entries exist.
vi.mock('../../context/DepartmentContext', () => ({
  useDepartment: () => ({ activeDepartment: null }),
}));
let canImpl: (p: string) => boolean = () => true;
vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({ permissions: { can: (p: string) => canImpl(p) } }),
}));

const renderSidebar = () => render(<MemoryRouter><Sidebar /></MemoryRouter>);

beforeEach(() => { canImpl = () => true; });

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

  it('renders Client Portal as a single top-level item (outside Departments) pointing at /client-portal', () => {
    renderSidebar();
    // Top-level: visible without expanding the collapsed Departments group; exactly one, no duplicates.
    const links = screen.getAllByRole('link', { name: 'Client Portal' });
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/client-portal');
  });

  it('hides Client Portal for a role without portal:preview', () => {
    canImpl = () => false;
    renderSidebar();
    expect(screen.queryByRole('link', { name: 'Client Portal' })).toBeNull();
  });

  it('logo (with portal:preview) links to the client portal in a new tab, hardened, no nested interactive', () => {
    canImpl = () => true; // holds portal:preview
    renderSidebar();
    const logo = screen.getByRole('link', { name: 'Go to Client Portal Overview' });
    expect(logo.getAttribute('href')).toBe('/client-portal');
    expect(logo.getAttribute('target')).toBe('_blank');
    // new-tab hardening: no window.opener access, no referrer leak.
    const rel = logo.getAttribute('rel') ?? '';
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
    expect(logo.querySelector('a, button')).toBeNull();
    expect(logo.textContent).toContain('HPX EIGEN CRM');
  });

  it('logo (without portal:preview) falls back to an in-place /overview home link', () => {
    canImpl = () => false; // lacks portal:preview
    renderSidebar();
    const logo = screen.getByRole('link', { name: 'Go to Overview' });
    expect(logo.getAttribute('href')).toBe('/overview');
    expect(logo.getAttribute('target')).toBeNull(); // in-place, not a new tab
    expect(screen.queryByRole('link', { name: 'Go to Client Portal Overview' })).toBeNull();
  });
});
