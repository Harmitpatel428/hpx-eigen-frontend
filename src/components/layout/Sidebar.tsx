import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Search,
  LayoutGrid,
  Users,
  Building,
  ActivitySquare,
  Briefcase,
  Settings,
  CircleHelp,
  Command,
  FileText,
  CreditCard
} from 'lucide-react';

const mainNav = [
  { label: 'Overview', path: '/', icon: LayoutGrid },
  { label: 'Leads', path: '/leads', icon: Users },
  { label: 'Contacts', path: '/contacts', icon: Building },
  { label: 'Pipeline', path: '/pipeline', icon: Briefcase },
  { label: 'Activities', path: '/activities', icon: ActivitySquare },
  { label: 'Invoices', path: '/invoices', icon: FileText },
  { label: 'Payments', path: '/payments', icon: CreditCard },
];

export const Sidebar = React.memo(function Sidebar() {
  return (
    <aside className="w-64 bg-gray-950 text-white border-r border-[var(--border-light)] flex flex-col px-3 py-6 shrink-0 sticky top-0 h-screen">
      {/* Brand & Workspace */}
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="w-6 h-6 rounded-sm bg-white text-gray-950 flex items-center justify-center">
          <Command size={14} />
        </div>
        <span className="text-sm font-semibold tracking-tight text-white">HPX EIGEN CRM</span>
      </div>

      {/* Global Search Button */}
      <button className="flex items-center gap-2 px-3 py-2 mb-6 bg-gray-900 border border-gray-800 rounded-md text-gray-400 hover:text-white transition-all duration-150 group">
        <Search size={14} className="group-hover:text-white transition-colors" />
        <span className="text-sm font-normal text-left flex-1">Search...</span>
        <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 bg-gray-800 rounded-sm">⌘K</span>
      </button>

      {/* Navigation */}
      <nav className="flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-3 mb-2">Your Workspace</div>
        <ul className="flex flex-col gap-0.5">
          {mainNav.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150
                  ${isActive 
                    ? 'bg-gray-800 text-white font-medium shadow-sm' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-900 font-normal'}
                `}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer Navigation */}
      <nav>
        <ul className="flex flex-col gap-0.5">
          <li>
            <NavLink 
              to="/settings" 
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150
                ${isActive ? 'bg-gray-800 text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-gray-900'}
              `}
            >
              <Settings size={16} /> Settings
            </NavLink>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-normal text-gray-400 hover:text-white hover:bg-gray-900 transition-all duration-150">
              <CircleHelp size={16} /> Help & Documentation
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
});
