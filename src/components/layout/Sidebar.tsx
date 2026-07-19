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
  Command
} from 'lucide-react';

const mainNav = [
  { label: 'Overview', path: '/', icon: LayoutGrid },
  { label: 'Leads', path: '/leads', icon: Users },
  { label: 'Contacts', path: '/contacts', icon: Building },
  { label: 'Pipeline', path: '/pipeline', icon: Briefcase },
  { label: 'Activities', path: '/activities', icon: ActivitySquare },
];

export function Sidebar() {
  return (
    <aside className="workspace-sidebar">
      {/* Brand & Workspace */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-8)', padding: '0 var(--space-2)' }}>
        <div style={{ width: 24, height: 24, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-accent)', color: 'var(--text-inverse)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Command size={14} />
        </div>
        <span className="type-ui" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>HPX EIGEN CRM</span>
      </div>

      {/* Global Search Button (Linear Style) */}
      <button style={{ 
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)', 
        padding: '8px var(--space-3)', marginBottom: 'var(--space-6)',
        backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-light)', 
        borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', 
        transition: 'all var(--transition-fast)' 
      }}>
        <Search size={14} />
        <span className="type-ui" style={{ flex: 1, textAlign: 'left', fontWeight: 400 }}>Search...</span>
        <span className="type-micro" style={{ padding: '2px 4px', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)' }}>⌘K</span>
      </button>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        <div className="type-micro" style={{ padding: '0 var(--space-3)', marginBottom: 'var(--space-2)' }}>Your Workspace</div>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {mainNav.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: '8px var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--bg-app)' : 'transparent',
                  fontWeight: isActive ? 500 : 400,
                  fontSize: 'var(--text-sm)',
                  boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.02)' : 'none',
                  transition: 'all var(--transition-fast)'
                })}
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
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <li>
            <NavLink to="/settings" style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '8px var(--space-3)', borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', backgroundColor: isActive ? 'var(--bg-app)' : 'transparent', fontWeight: isActive ? 500 : 400, fontSize: 'var(--text-sm)'
              })}>
              <Settings size={16} /> Settings
            </NavLink>
          </li>
          <li>
            <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '8px var(--space-3)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontWeight: 400, fontSize: 'var(--text-sm)' }}>
              <CircleHelp size={16} /> Help & Documentation
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
