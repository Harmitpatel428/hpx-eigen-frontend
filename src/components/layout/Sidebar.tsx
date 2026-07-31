import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Users,
  Contact,
  GitBranch,
  Activity,
  FileText,
  CreditCard,
  Settings,
  LifeBuoy,
  Briefcase,
  FileCode
} from 'lucide-react';
import { DepartmentSwitcher } from './DepartmentSwitcher';
import { useDepartments } from '../../context/DepartmentContext';

const navConfig: Record<string, { label: string; path: string; icon: React.ElementType }[]> = {
  sales: [
    { label: 'Leads', path: '/sales/leads', icon: Users },
    { label: 'Contacts', path: '/sales/contacts', icon: Contact },
    { label: 'Opportunities', path: '/sales/opportunities', icon: GitBranch },
    { label: 'Pipeline', path: '/sales/pipeline', icon: Activity },
    { label: 'Activities', path: '/sales/activities', icon: Activity },
    { label: 'Invoices', path: '/sales/invoices', icon: FileText },
    { label: 'Payments', path: '/sales/payments', icon: CreditCard },
  ],
  process: [
    { label: 'Projects', path: '/process/projects', icon: Briefcase },
  ],
  docs: [
    { label: 'Templates', path: '/docs/templates', icon: FileCode },
  ],
};

export const Sidebar = React.memo(function Sidebar() {
  const { activeDepartmentId, getSlugFromDepartmentId } = useDepartments();
  const slug = activeDepartmentId ? getSlugFromDepartmentId(activeDepartmentId) : 'sales';
  const mainNav = navConfig[slug || 'sales'] || [];

  const linkBaseClass = "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const linkActiveClass = "bg-[var(--bg-muted)] text-[var(--text-primary)] font-semibold";
  const linkInactiveClass = "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]";

  return (
    <aside className="w-64 h-screen flex flex-col bg-[var(--bg-app)] border-r border-[var(--border-light)] text-[var(--text-secondary)] flex-shrink-0 sticky top-0">
      {/* Top Header */}
      <div className="p-4 border-b border-[var(--border-light)] space-y-4">
        <h1 className="text-lg font-bold tracking-wide text-[var(--text-primary)]">HPX EIGEN</h1>
        <DepartmentSwitcher />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        <p className="text-xs font-semibold uppercase text-[var(--text-tertiary)] tracking-wider mb-2">Workspace</p>
        {mainNav.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `${linkBaseClass} ${isActive ? linkActiveClass : linkInactiveClass}`}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-[var(--border-light)] space-y-1">
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `${linkBaseClass} ${isActive ? linkActiveClass : linkInactiveClass}`}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
});
