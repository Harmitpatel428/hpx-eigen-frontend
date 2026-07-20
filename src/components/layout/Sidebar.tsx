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
    <aside className="w-64 bg-slate-950 text-white border-r border-slate-800 flex flex-col shrink-0 sticky top-0 h-screen overflow-y-auto">
      {/* Top Section */}
      <div className="p-4 flex flex-col gap-4">
        {/* Brand & Workspace */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-white text-slate-950 flex items-center justify-center shrink-0">
            <Command size={14} />
          </div>
          <span className="text-sm font-bold tracking-tight text-white uppercase">HPX EIGEN CRM</span>
        </div>

        {/* Global Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-md pl-9 pr-9 py-2 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Search..."
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">⌘K</span>
          </div>
        </div>
      </div>

      {/* Middle Section (Main Nav) */}
      <nav className="flex-1 px-3 pb-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 mb-2 mt-2">Your Workspace</div>
        <ul className="flex flex-col gap-1">
          {mainNav.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 group
                  ${isActive 
                    ? 'bg-slate-800 text-blue-400 font-medium' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-900 font-normal'}
                `}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={16} className={`${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'} transition-colors`} strokeWidth={isActive ? 2.5 : 2} />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section */}
      <nav className="px-3 pb-4 mt-auto">
        <ul className="flex flex-col gap-1">
          <li>
            <NavLink 
              to="/settings" 
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 group
                ${isActive ? 'bg-slate-800 text-blue-400 font-medium' : 'text-slate-400 hover:text-white hover:bg-slate-900'}
              `}
            >
              {({ isActive }) => (
                <>
                  <Settings size={16} className={`${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'}`} /> 
                  Settings
                </>
              )}
            </NavLink>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-normal text-slate-400 hover:text-white hover:bg-slate-900 transition-all duration-150 group">
              <CircleHelp size={16} className="text-slate-400 group-hover:text-white" /> Help & Documentation
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
});
