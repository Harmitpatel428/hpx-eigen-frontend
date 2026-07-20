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
  const linkActiveClass = "bg-slate-800 text-white shadow-sm";
  const linkInactiveClass = "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200";

  return (
    <aside className="w-64 h-screen flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 flex-shrink-0 sticky top-0">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 space-y-4">
        <h1 className="text-lg font-bold tracking-wide text-white">HPX EIGEN CRM</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            className="w-full bg-slate-800 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="Search..."
          />
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">Your Workspace</p>
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
      <div className="p-4 border-t border-slate-800 space-y-1">
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
