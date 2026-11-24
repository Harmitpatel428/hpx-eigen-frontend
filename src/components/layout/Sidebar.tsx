import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDepartment } from '../../context/DepartmentContext';
import { useAuth } from '../../auth/context/AuthContext';
import { HpxMark } from '../brand/HpxLogo';
import {
  LayoutDashboard,
  GitBranch,
  FileText,
  CreditCard,
  Settings,
  Building2,
  ChevronDown,
  ChevronRight,
  Trash2,
  Globe,
} from 'lucide-react';

const baseNavigation: { name: string; href: string; icon: typeof LayoutDashboard; permission?: string }[] = [
  { name: 'Overview',     href: '/overview',      icon: LayoutDashboard },
  { name: 'Pipeline',     href: '/pipeline',       icon: GitBranch       },
  { name: 'Invoices',     href: '/invoices',       icon: FileText        },
  { name: 'Payments',     href: '/payments',       icon: CreditCard      },
  // Top-level, after Payments: the client-facing portal lookup. Permission-gated; the per-case staff preview
  // is reached from a case, not here.
  { name: 'Client Portal', href: '/client-portal', icon: Globe, permission: 'portal:preview' },
];

const allDepartmentItems: { name: string; href: string; permission?: string }[] = [
  { name: 'Sales',          href: '/leads'         },
  { name: 'Documentation',  href: '/documentation' },
  { name: 'Process',        href: '/process',       permission: 'process:view' },
];

const bottomNavigation = [
  { name: 'Recycle Bin',    href: '/recycle-bin', icon: Trash2     },
  { name: 'Settings',       href: '/settings',    icon: Settings   },
];

// Shared logo-link styling (reused by both the gated portal <a> and the /overview fallback NavLink)
// so the mark + wordmark look identical regardless of destination.
const logoLinkStyle: React.CSSProperties = {
  height: 56, display: 'flex', alignItems: 'center', gap: 10,
  paddingInline: 24, flexShrink: 0,
  textDecoration: 'none', color: 'inherit', cursor: 'pointer',
};
const logoWordmarkStyle: React.CSSProperties = { fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' };

export const Sidebar: React.FC<{ open?: boolean }> = ({ open = false }) => {
  const { activeDepartment } = useDepartment();
  const { permissions } = useAuth();
  const location = useLocation();
  const departmentItems = allDepartmentItems.filter(d => !d.permission || permissions.can(d.permission));
  // Reports & Configuration were relocated to the Settings page; the sidebar no
  // longer links them (routes keep their own ProtectedRoute permission guards).
  const bottomItems = bottomNavigation;
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
      className={`sidebar-root${open ? ' is-open' : ''}`}
      style={{
        display: 'flex', flexDirection: 'column',
        width: 260, height: '100vh', flexShrink: 0,
      }}
    >
      {/* Logo — official HPX EIGEN mark + product wordmark, doubling as a nav link.
          Gated like the Client Portal menu item: only portal:preview holders get the portal
          destination (opened in a new tab so the authenticated workspace stays put, with
          rel="noopener noreferrer" hardening). Everyone else lands on the Overview home. */}
      {permissions.can('portal:preview') ? (
        <a
          href="/client-portal"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Go to Client Portal Overview"
          className="sidebar-logo-link"
          style={logoLinkStyle}
        >
          <HpxMark size={22} />
          <span className="sidebar-logo" style={logoWordmarkStyle}>HPX EIGEN CRM</span>
        </a>
      ) : (
        <NavLink to="/overview" aria-label="Go to Overview" className="sidebar-logo-link" style={logoLinkStyle}>
          <HpxMark size={22} />
          <span className="sidebar-logo" style={logoWordmarkStyle}>HPX EIGEN CRM</span>
        </NavLink>
      )}

      {/* Main nav */}
      <nav style={{ flex: 1, padding: '4px 12px', overflowY: 'auto' }}>
        <p className="sidebar-section-label" style={{
          fontSize: 12, fontWeight: 600,
          paddingInline: 12, paddingBlock: '16px 8px',
        }}>
          Workspace
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
                padding: '8px 12px', marginBottom: 2,
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
              }}
            >
              <item.icon
                className="sidebar-nav-icon"
                style={{ width: 16, height: 16, flexShrink: 0 }}
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
            style={{ width: 16, height: 16, flexShrink: 0 }}
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
                    padding: '8px 12px', marginBottom: 2,
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
        {navigation.slice(1).filter(item => !item.permission || permissions.can(item.permission)).map(item => {
          // Client Portal highlights on its route and any sub-route; the others keep exact matching unchanged.
          const isActive = item.href === '/client-portal'
            ? location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
            : location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`sidebar-nav-item${isActive ? ' is-active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', marginBottom: 2,
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
              }}
            >
              <item.icon
                className="sidebar-nav-icon"
                style={{ width: 16, height: 16, flexShrink: 0 }}
                strokeWidth={1.5}
              />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <nav className="sidebar-bottom-border" style={{ padding: '6px 12px 12px' }}>
        {bottomItems.map(item => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`sidebar-nav-item${isActive ? ' is-active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', marginBottom: 2,
                fontSize: 13, fontWeight: 500, textDecoration: 'none',
              }}
            >
              <item.icon
                className="sidebar-nav-icon"
                style={{ width: 16, height: 16, flexShrink: 0 }}
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
