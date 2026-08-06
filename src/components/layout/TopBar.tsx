import React, { useState, useRef, useEffect } from 'react';
import { DepartmentSwitcher } from '../ui/DepartmentSwitcher';
import { Bell, Sun, Moon, LogOut, CheckCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import type { User } from '../../auth/contracts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Notif {
  id: number;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

// ── Seed notifications (replace with real API when endpoint exists) ───────────

const SEED_NOTIFS: Notif[] = [
  { id: 1, title: 'New lead assigned',        body: 'Infosys Consulting added to your pipeline',      time: '2m ago',  read: false },
  { id: 2, title: 'Deal moved to Negotiation', body: 'Tata Consultancy Services — ₹18L opportunity', time: '14m ago', read: false },
  { id: 3, title: 'Activity reminder',         body: 'Follow-up call with Rajesh Gupta due today',   time: '1h ago',  read: true  },
];

// ── Shared dropdown shell ──────────────────────────────────────────────────────

const Panel: React.FC<{ width?: number; children: React.ReactNode }> = ({ width = 320, children }) => (
  <div style={{
    position: 'absolute', right: 0, top: 'calc(100% + 10px)',
    width, zIndex: 300,
    backgroundColor: 'var(--bg-subtle)',
    border: '1px solid var(--border-medium)',
    borderRadius: 18,
    boxShadow: '0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06)',
    overflow: 'hidden',
    animation: 'topbar-dropdown 0.2s cubic-bezier(0.22,1,0.36,1) both',
  }}>
    {children}
  </div>
);

// ── Notification panel ─────────────────────────────────────────────────────────

const NotifPanel: React.FC<{ notifs: Notif[]; onMarkAll: () => void }> = ({ notifs, onMarkAll }) => {
  const unread = notifs.filter(n => !n.read).length;

  return (
    <Panel width={340}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Notifications
          </span>
          {unread > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, lineHeight: 1,
              background: '#7C3AED', color: '#fff',
              padding: '2px 7px', borderRadius: 99,
            }}>
              {unread} new
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={onMarkAll}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#7C3AED', fontWeight: 500 }}
          >
            <CheckCheck size={13} strokeWidth={2} />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {notifs.length === 0 ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            All caught up ✓
          </div>
        ) : (
          notifs.map(n => (
            <div
              key={n.id}
              className="topbar-notif-row"
              style={{
                display: 'flex', gap: 11, padding: '12px 16px',
                borderBottom: '1px solid var(--border-light)',
                background: n.read ? 'transparent' : 'rgba(124,58,237,0.05)',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: 7, height: 7, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                background: n.read ? 'var(--border-strong)' : '#7C3AED',
              }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                  {n.title}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: 5 }}>
                  {n.body}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{n.time}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border-light)',
        textAlign: 'center',
      }}>
        <button style={{ fontSize: 12, color: '#7C3AED', fontWeight: 500 }}>
          View all notifications →
        </button>
      </div>
    </Panel>
  );
};

// ── Profile panel ──────────────────────────────────────────────────────────────

const ProfilePanel: React.FC<{ user: User | null; initials: string; onLogout: () => void }> = ({
  user, initials, onLogout,
}) => (
  <Panel width={236}>
    {/* User info */}
    <div style={{ padding: '14px', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 600, color: '#fff',
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {user?.name || 'Account User'}
          </p>
          <p style={{
            fontSize: 11, color: 'var(--text-tertiary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginTop: 2,
          }}>
            {user?.email}
          </p>
          {user?.roles && user.roles.length > 0 && (
            <span style={{
              display: 'inline-block', marginTop: 5,
              fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
              background: 'rgba(124,58,237,0.1)', color: '#7C3AED',
              padding: '2px 6px', borderRadius: 6,
            }}>
              {user.roles[0]}
            </span>
          )}
        </div>
      </div>
    </div>

    {/* Actions */}
    <div style={{ padding: 6 }}>
      <button
        onClick={onLogout}
        className="topbar-logout-btn"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9,
          padding: '9px 10px', borderRadius: 10,
          fontSize: 13, fontWeight: 500, color: '#EF4444',
          transition: 'background 0.15s',
        }}
      >
        <LogOut size={14} strokeWidth={1.5} />
        Sign out
      </button>
    </div>
  </Panel>
);

// ── TopBar ─────────────────────────────────────────────────────────────────────

export const TopBar: React.FC = () => {
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>(SEED_NOTIFS);

  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  const initials = (() => {
    if (user?.name) return user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return (user?.email?.[0] ?? 'U').toUpperCase();
  })();

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current   && !notifRef.current.contains(e.target   as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header style={{
      display: 'flex', height: 56, alignItems: 'center',
      borderBottom: '1px solid var(--border-light)',
      backgroundColor: 'var(--bg-subtle)',
      paddingInline: 24, position: 'relative', zIndex: 50,
    }}>
      <DepartmentSwitcher />

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>

        {/* ── Theme toggle ── */}
        <button
          onClick={toggleTheme}
          className="topbar-icon-btn"
          style={{ width: 36, height: 36 }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span key={theme} className="topbar-theme-icon" style={{ display: 'flex' }}>
            {theme === 'dark'
              ? <Sun  size={16} strokeWidth={1.5} />
              : <Moon size={16} strokeWidth={1.5} />
            }
          </span>
        </button>

        {/* ── Notification bell ── */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
            className="topbar-icon-btn"
            style={{ width: 36, height: 36, position: 'relative' }}
            title="Notifications"
          >
            <Bell size={16} strokeWidth={1.5} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: 8, right: 8,
                width: 7, height: 7, borderRadius: '50%',
                background: '#7C3AED',
                boxShadow: '0 0 0 2px var(--bg-subtle)',
              }}>
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: '#7C3AED', opacity: 0.6,
                  animation: 'topbar-ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
                }} />
              </span>
            )}
          </button>

          {notifOpen && (
            <NotifPanel
              notifs={notifs}
              onMarkAll={() => setNotifs(ns => ns.map(n => ({ ...n, read: true })))}
            />
          )}
        </div>

        {/* ── User avatar ── */}
        <div ref={profileRef} style={{ position: 'relative', marginLeft: 4 }}>
          <button
            onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
            className="topbar-avatar-btn"
            title="Account"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
              fontSize: 12, fontWeight: 600, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 2px var(--bg-subtle), 0 0 0 3.5px rgba(124,58,237,0.3)',
              flexShrink: 0,
            }}
          >
            {initials}
          </button>

          {profileOpen && (
            <ProfilePanel user={user} initials={initials} onLogout={logout} />
          )}
        </div>

      </div>
    </header>
  );
};
