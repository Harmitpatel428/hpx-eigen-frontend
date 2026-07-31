import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDepartment } from '../../context/DepartmentContext';
import {
  LayoutDashboard,
  Users,
  Contact,
  GitBranch,
  Activity,
  FileText,
  CreditCard,
  Wallet,
  Settings,
  HelpCircle,
  Search,
  BarChart3,
  ClipboardCheck,
  FileCheck
} from 'lucide-react';

const baseNavigation = [
  { name: 'Overview', href: '/overview', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Contacts', href: '/contacts', icon: Contact },
  { name: 'Pipeline', href: '/pipeline', icon: GitBranch },
  { name: 'Activities', href: '/activities', icon: Activity },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Payments', href: '/payments', icon: CreditCard },
];

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help & Documentation', href: '/help', icon: HelpCircle },
];

export const Sidebar: React.FC = () => {
  const { activeDepartment } = useDepartment();
  const location = useLocation();

  // Dynamic labels based on department context
  const navigation = React.useMemo(() => {
    return baseNavigation.map(item => {
      if (item.href === '/pipeline') {
        const name = activeDepartment?.name?.toLowerCase() ?? '';
        let label = 'Pipeline';
        if (name.includes('process')) label = 'Task Queue';
        if (name.includes('documentation') || name.includes('doc')) label = 'Doc Pipeline';
        
        return { ...item, name: label };
      }
      return item;
    });
  }, [activeDepartment]);

  return (
    <aside className="flex h-screen w-[260px] flex-col border-r border-gray-100 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <h1 className="text-[15px] font-bold tracking-tight text-gray-900">
          HPX EIGEN CRM
        </h1>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search..."
            className="h-10 w-full rounded-xl bg-gray-50 pl-10 pr-4 text-[13px] text-gray-900 placeholder-gray-400 outline-none transition-all focus:bg-gray-100 focus:ring-1 focus:ring-gray-200"
          />
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 space-y-0.5 px-3">
        <p className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Your Workspace
        </p>
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`
                group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon 
                className={`h-[18px] w-[18px] transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`} 
                strokeWidth={1.5}
              />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <nav className="border-t border-gray-100 px-3 py-3 space-y-0.5">
        {bottomNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-900"
          >
            <item.icon className="h-[18px] w-[18px] text-gray-400 group-hover:text-gray-600" strokeWidth={1.5} />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
