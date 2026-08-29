import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DepartmentSwitcher } from '../ui/DepartmentSwitcher';
import { Bell, Sun, Moon, LogOut, CheckCheck, User, Settings, Shield } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../auth/public';
import type { User as UserType } from '../../auth/public';
import { api } from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  actionUrl?: string;
}

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

// ── Time formatting ───────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Notification panel ─────────────────────────────────────────────────────────

const NotifPanel: React.FC<{
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
  onMarkAll: () => void;
  onMarkRead: (id: string) => void;
  onViewAll: () => void;
}> = ({ notifications, loading, unreadCount, onMarkAll, onMarkRead, onViewAll }) => (
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
        {unreadCount > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, lineHeight: 1,
            background: '#7C3AED', color: '#fff',
            padding: '2px 7px', borderRadius: 99,
          }}>
            {unreadCount} new
          </span>
        )}
      </div>
      {unreadCount > 0 && (
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
      {loading ? (
        <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
          Loading...
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
          All caught up
        </div>
      ) : (
        notifications.map(n => (
          <div
            key={n.id}
            className="topbar-notif-row"
            onClick={() => { if (!n.readAt) onMarkRead(n.id); }}
            style={{
              display: 'flex', gap: 11, padding: '12px 16px',
              borderBottom: '1px solid var(--border-light)',
              background: n.readAt ? 'transparent' : 'rgba(124,58,237,0.05)',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            <div style={{
              width: 7, height: 7, borderRadius: '50%', marginTop: 5, flexShrink: 0,
              background: n.readAt ? 'var(--border-strong)' : '#7C3AED',
            }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: n.readAt ? 400 : 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                {n.title}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: 5 }}>
                {n.message}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{timeAgo(n.createdAt)}</p>
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
      <button onClick={onViewAll} style={{ fontSize: 12, color: '#7C3AED', fontWeight: 500 }}>
        View all notifications
      </button>
    </div>
  </Panel>
);

// ── Profile panel ──────────────────────────────────────────────────────────────

const ProfilePanel: React.FC<{
  user: UserType | null;
  initials: string;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}> = ({ user, initials, onLogout, onNavigate }) => (
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

    {/* Navigation actions */}
    <div style={{ padding: 6 }}>
      {[
        { label: 'Profile', icon: User, path: '/settings', tab: 'profile' },
        { label: 'Settings', icon: Settings, path: '/settings', tab: 'general' },
        { label: 'Security', icon: Shield, path: '/settings', tab: 'security' },
      ].map(item => (
        <button
          key={item.label}
          onClick={() => onNavigate(item.path)}
          className="topbar-logout-btn"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '9px 10px', borderRadius: 10,
            fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
            transition: 'background 0.15s',
          }}
        >
          <item.icon size={14} strokeWidth={1.5} />
          {item.label}
        </button>
      ))}

      <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 10px' }} />

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
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const initials = (() => {
    if (user?.name && user.name !== user.email) return user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
    return (user?.email?.[0] ?? 'U').toUpperCase();
  })();

  // Fetch unread count on mount and periodically
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/notifications/unread-count');
      setUnreadCount((res.data as any)?.data?.count ?? 0);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch notifications when panel opens
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await api.get('/api/v1/notifications', { params: { limit: 10 } });
      setNotifications((res.data as any)?.data?.notifications ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const handleNotifOpen = () => {
    setNotifOpen(v => {
      if (!v) fetchNotifications();
      return !v;
    });
    setProfileOpen(false);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/api/v1/notifications/${id}/read`);
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const handleMarkAll = async () => {
    try {
      await api.patch('/api/v1/notifications/read-all');
      setNotifications(ns => ns.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>

        {/* ── Theme toggle ── */}
        <button
          onClick={toggleTheme}
          className="topbar-icon-btn"
          style={{ width: 36, height: 36 }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span key={theme} className="topbar-theme-icon" style={{ display: 'flex' }}>
            {theme === 'dark'
              ? <Sun size={16} strokeWidth={1.5} />
              : <Moon size={16} strokeWidth={1.5} />
            }
          </span>
        </button>

        {/* ── Notification bell ── */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={handleNotifOpen}
            className="topbar-icon-btn"
            style={{ width: 36, height: 36, position: 'relative' }}
            title="Notifications"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell size={16} strokeWidth={1.5} />
            {unreadCount > 0 && (
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
              notifications={notifications}
              loading={notifLoading}
              unreadCount={unreadCount}
              onMarkAll={handleMarkAll}
              onMarkRead={handleMarkRead}
              onViewAll={() => { setNotifOpen(false); navigate('/settings'); }}
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
            <ProfilePanel
              user={user}
              initials={initials}
              onLogout={logout}
              onNavigate={(path) => { setProfileOpen(false); navigate(path); }}
            />
          )}
        </div>

      </div>
    </header>
  );
};
