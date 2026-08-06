import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDepartment } from '../../context/DepartmentContext';
import {
  LayoutDashboard,
  GitBranch,
  Activity,
  FileText,
  CreditCard,
  Settings,
  HelpCircle,
  Building2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const baseNavigation = [
  { name: 'Overview',   href: '/overview',   icon: LayoutDashboard },
  { name: 'Pipeline',   href: '/pipeline',    icon: GitBranch       },
  { name: 'Activities', href: '/activities',  icon: Activity        },
  { name: 'Invoices',   href: '/invoices',    icon: FileText        },
  { name: 'Payments',   href: '/payments',    icon: CreditCard      },
];

const departmentItems = [
  { name: 'Sales',          href: '/leads'         },
  { name: 'Documentation',  href: '/documentation' },
  { name: 'Process',        href: '/process'       },
];

const bottomNavigation = [
  { name: 'Settings',       href: '/settings', icon: Settings   },
  { name: 'Help & Support', href: '/help',      icon: HelpCircle },
];

export const Sidebar: React.FC = () => {
  const { activeDepartment } = useDepartment();
  const location = useLocation();
  const [deptOpen, setDeptOpen] = React.useState(
    departmentItems.some(d => location.pathname === d.href)
  );

  const navigation = React.useMemo(() => {
    return baseNavigation.map(item => {
      if (item.href !== '/pipeline') return item;
      const name = activeDepartment?.name?.toLowerCase() ?? '';
      let label = 'Pipeline';
      if (name.includes('process')) label = 'Task Queue';
      if (name.includes('documentation') || name.includes('doc')) label = 'Doc Pipeline';
      return { ...item, name: label };
    });
  }, [activeDepartment]);

  const isDeptChildActive = departmentItems.some(d => location.pathname === d.href);

  return (
    <aside
      className="sidebar-root"
      style={{
        display: 'flex', flexDirection: 'column',
        width: 260, height: '100vh', flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        paddingInline: 24, flexShrink: 0,
      }}>
        <span className="sidebar-logo" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>
          HPX EIGEN CRM
        </span>
      </div>

      {/* Main nav */}
      <nav style={{ flex: 1, padding: '4px 12px', overflowY: 'auto' }}>
        <p className="sidebar-section-label" style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.1em', paddingInline: 12, paddingBlock: '16px 8px',
        }}>
          Your Workspace
        </p>

        {/* Overview */}
        {navigation.slice(0, 1).map(item => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`sidebar-nav-item${isActive ? ' is-active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', marginBottom: 2,
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
              }}
            >
              <item.icon
                className="sidebar-nav-icon"
                style={{ width: 17, height: 17, flexShrink: 0 }}
                strokeWidth={1.5}
              />
              {item.name}
            </NavLink>
          );
        })}

        {/* Departments dropdown */}
        <button
          onClick={() => setDeptOpen(o => !o)}
          className={`sidebar-nav-item${isDeptChildActive && !deptOpen ? ' is-active' : ''}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', marginBottom: 2,
            fontSize: 13, fontWeight: 500,
            width: '100%', textAlign: 'left',
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <Building2
            className="sidebar-nav-icon"
            style={{ width: 17, height: 17, flexShrink: 0 }}
            strokeWidth={1.5}
          />
          <span style={{ flex: 1 }}>Departments</span>
          {deptOpen
            ? <ChevronDown style={{ width: 14, height: 14, opacity: 0.5 }} strokeWidth={1.5} />
            : <ChevronRight style={{ width: 14, height: 14, opacity: 0.5 }} strokeWidth={1.5} />
          }
        </button>

        {deptOpen && (
          <div style={{ paddingLeft: 16, marginBottom: 2 }}>
            {departmentItems.map(item => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`sidebar-nav-item${isActive ? ' is-active' : ''}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 12px', marginBottom: 2,
                    fontSize: 13, fontWeight: 500, textDecoration: 'none',
                  }}
                >
                  {item.name}
                </NavLink>
              );
            })}
          </div>
        )}

        {/* Remaining nav items */}
        {navigation.slice(1).map(item => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`sidebar-nav-item${isActive ? ' is-active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', marginBottom: 2,
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
              }}
            >
              <item.icon
                className="sidebar-nav-icon"
                style={{ width: 17, height: 17, flexShrink: 0 }}
                strokeWidth={1.5}
              />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <nav className="sidebar-bottom-border" style={{ padding: '6px 12px 12px' }}>
        {bottomNavigation.map(item => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`sidebar-nav-item${isActive ? ' is-active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', marginBottom: 2,
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
              }}
            >
              <item.icon
                className="sidebar-nav-icon"
                style={{ width: 17, height: 17, flexShrink: 0 }}
                strokeWidth={1.5}
              />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
