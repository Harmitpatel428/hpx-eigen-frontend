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
  LifeBuoy
} from 'lucide-react';

const mainNav = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Leads', path: '/leads', icon: Users },
  { label: 'Contacts', path: '/contacts', icon: Contact },
  { label: 'Pipeline', path: '/pipeline', icon: GitBranch },
  { label: 'Activities', path: '/activities', icon: Activity },
  { label: 'Invoices', path: '/invoices', icon: FileText },
  { label: 'Payments', path: '/payments', icon: CreditCard },
];

export const Sidebar = React.memo(function Sidebar() {
  const linkBaseClass = "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const linkActiveClass = "bg-slate-100 text-slate-900 font-semibold";
  const linkInactiveClass = "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

  return (
    <aside className="w-64 h-screen flex flex-col bg-white border-r border-slate-200 text-slate-600 flex-shrink-0 sticky top-0">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-200 space-y-4">
        <h1 className="text-lg font-bold tracking-wide text-slate-900">HPX EIGEN CRM</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="w-full bg-slate-100 border border-slate-200 rounded-md py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all"
            placeholder="Search..."
          />
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">Your Workspace</p>
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
      <div className="p-4 border-t border-slate-200 space-y-1">
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `${linkBaseClass} ${isActive ? linkActiveClass : linkInactiveClass}`}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          Settings
        </NavLink>
        <a 
          href="#" 
          className={`${linkBaseClass} ${linkInactiveClass}`}
        >
          <LifeBuoy className="h-4 w-4 flex-shrink-0" />
          Help & Documentation
        </a>
      </div>
    </aside>
  );
});
