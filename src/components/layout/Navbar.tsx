import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, LogOut, Sun, Moon } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'flex-end',
      padding: 'var(--space-4) var(--space-8)',
      flexShrink: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        
        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button 
            className="btn-icon" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button className="btn-icon" style={{ position: 'relative' }}>
            <Bell size={16} />
            <span style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, backgroundColor: 'var(--color-danger)', borderRadius: '50%' }} />
          </button>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 16, backgroundColor: 'var(--border-light)' }} />

        {/* Profile */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)', 
              padding: '2px', borderRadius: 'var(--radius-full)', 
              transition: 'all var(--transition-fast)' 
            }}
          >
            <div className="avatar">
              <img src="https://ui-avatars.com/api/?name=Admin+User&background=random&color=fff" alt="User" />
            </div>
          </button>

          {menuOpen && (
            <div className="surface-elevated" style={{
              position: 'absolute', top: 'calc(100% + var(--space-2))', right: 0, width: 220, padding: 'var(--space-2)', zIndex: 100
            }}>
              <div style={{ padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-2)' }}>
                <div className="type-ui" style={{ color: 'var(--text-primary)' }}>{user?.email ?? 'admin@hpxeigen.com'}</div>
                <div className="type-micro" style={{ marginTop: 'var(--space-1)' }}>Administrator</div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: 'var(--space-2) 0' }} />
              <button 
                onClick={() => { navigate('/settings'); setMenuOpen(false); }}
                className="btn-ghost" 
                style={{ width: '100%', justifyContent: 'flex-start', height: 32 }}
              >
                <Settings size={14} /> Account Settings
              </button>
              <button 
                onClick={handleLogout} 
                className="btn-ghost" 
                style={{ width: '100%', justifyContent: 'flex-start', height: 32, color: 'var(--color-danger)' }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
