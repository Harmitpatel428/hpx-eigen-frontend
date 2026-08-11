import { useState } from 'react';
import { User, Building2, Bell, Shield, Key, CreditCard, Users, Loader2, Check } from 'lucide-react';
import { LeadIdentitySettings } from './settings/LeadIdentitySettings';
import { MembersSettings } from './settings/MembersSettings';
import { OrgManagement } from './settings/OrgManagement';
import { useAuth } from '../auth/public';
import { api } from '../services/api';
import { toast } from 'sonner';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, permissions, refreshUser } = useAuth();

  const workspaceTabs = [
    'general',
    ...(permissions.can('user:view') ? ['members'] : []),
    ...(permissions.can('role:manage') ? ['org-management'] : []),
    'billing',
  ];

  return (
    <div style={{ display: 'flex', gap: 'var(--space-16)', maxWidth: activeTab === 'org-management' ? 1280 : 1000 }}>
      {/* Sidebar */}
      <div style={{ width: 240, flexShrink: 0, position: 'sticky', top: 'var(--space-12)' }}>
        <h1 className="type-title" style={{ marginBottom: 'var(--space-8)' }}>Settings</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <div className="type-micro" style={{ padding: '0 var(--space-3)', marginBottom: 'var(--space-2)' }}>Personal</div>
          {['profile', 'notifications', 'security'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="type-ui"
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: '8px var(--space-3)', borderRadius: 'var(--radius-md)',
                backgroundColor: activeTab === tab ? 'var(--bg-app)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab ? 500 : 400,
                boxShadow: activeTab === tab ? '0 1px 2px rgba(0,0,0,0.02)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              {tab === 'profile' && <User size={16} />}
              {tab === 'notifications' && <Bell size={16} />}
              {tab === 'security' && <Shield size={16} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}

          <div className="type-micro" style={{ padding: '0 var(--space-3)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)' }}>Workspace</div>
          {workspaceTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="type-ui"
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: '8px var(--space-3)', borderRadius: 'var(--radius-md)',
                backgroundColor: activeTab === tab ? 'var(--bg-app)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab ? 500 : 400,
                boxShadow: activeTab === tab ? '0 1px 2px rgba(0,0,0,0.02)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              {tab === 'general' && <Building2 size={16} />}
              {tab === 'members' && <Key size={16} />}
              {tab === 'org-management' && <Users size={16} />}
              {tab === 'billing' && <CreditCard size={16} />}
              {tab === 'org-management' ? 'Organization Management' :
               tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: 'var(--space-24)', marginTop: 72 }}>
        {activeTab === 'profile' && <ProfileTab user={user} onSaved={refreshUser} />}

        {activeTab === 'security' && <SecurityTab />}

        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
            <section>
              <h2 className="type-h1" style={{ marginBottom: 'var(--space-2)' }}>General</h2>
              <p className="type-body" style={{ marginBottom: 'var(--space-8)', color: 'var(--text-secondary)' }}>Organization-wide workspace settings.</p>
            </section>
            <LeadIdentitySettings />
          </div>
        )}

        {activeTab === 'members' && <MembersSettings />}

        {activeTab === 'org-management' && <OrgManagement />}

        {!['profile', 'general', 'members', 'org-management', 'security'].includes(activeTab) && (
          <div style={{ padding: 'var(--space-24) 0', textAlign: 'center' }}>
            <h2 className="type-title" style={{ marginBottom: 'var(--space-2)' }}>Coming Soon</h2>
            <p className="type-body" style={{ color: 'var(--text-tertiary)' }}>This settings panel is being rebuilt.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────

function ProfileTab({ user, onSaved }: { user: any; onSaved: () => Promise<void> }) {
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/api/v1/users/me', { firstName: firstName || null, lastName: lastName || null, phone: phone || null });
      await onSaved();
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
      <section>
        <h2 className="type-h1" style={{ marginBottom: 'var(--space-2)' }}>Your Profile</h2>
        <p className="type-body" style={{ marginBottom: 'var(--space-8)' }}>Manage your personal information and how it appears in the workspace.</p>

        {/* Role badge (read-only) */}
        {user?.roles && user.roles.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span className="type-micro" style={{ textTransform: 'none', letterSpacing: 0 }}>Role</span>
            {user.roles.map((r: string) => (
              <span key={r} style={{
                display: 'inline-block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                background: 'rgba(124,58,237,0.1)', color: '#7C3AED',
                padding: '3px 8px', borderRadius: 6,
              }}>
                {r}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label className="type-ui" style={{ fontWeight: 500 }}>First Name</label>
            <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)}
              style={{ backgroundColor: 'transparent', border: '1px solid var(--border-medium)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label className="type-ui" style={{ fontWeight: 500 }}>Last Name</label>
            <input className="input" value={lastName} onChange={e => setLastName(e.target.value)}
              style={{ backgroundColor: 'transparent', border: '1px solid var(--border-medium)' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label className="type-ui" style={{ fontWeight: 500 }}>Email Address</label>
            <input className="input" type="email" value={user?.email ?? ''} disabled
              style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-medium)', opacity: 0.7 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label className="type-ui" style={{ fontWeight: 500 }}>Phone</label>
            <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="Optional"
              style={{ backgroundColor: 'transparent', border: '1px solid var(--border-medium)' }} />
          </div>
        </div>

        {/* Department & Team (read-only) */}
        {(user?.department || user?.team) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            {user.department && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <label className="type-ui" style={{ fontWeight: 500 }}>Department</label>
                <input className="input" value={user.department.name} disabled
                  style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-medium)', opacity: 0.7 }} />
              </div>
            )}
            {user.team && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <label className="type-ui" style={{ fontWeight: 500 }}>Team</label>
                <input className="input" value={user.team.name} disabled
                  style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-medium)', opacity: 0.7 }} />
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'var(--space-8)' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}
            style={{ padding: '0 var(--space-8)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
            Save Changes
          </button>
        </div>
      </section>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/v1/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to change password';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
      <section>
        <h2 className="type-h1" style={{ marginBottom: 'var(--space-2)' }}>Security</h2>
        <p className="type-body" style={{ marginBottom: 'var(--space-8)' }}>Manage your password and account security.</p>

        <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label className="type-ui" style={{ fontWeight: 500 }}>Current Password</label>
            <input className="input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              style={{ backgroundColor: 'transparent', border: '1px solid var(--border-medium)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label className="type-ui" style={{ fontWeight: 500 }}>New Password</label>
            <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              style={{ backgroundColor: 'transparent', border: '1px solid var(--border-medium)' }} />
            <span className="type-micro" style={{ textTransform: 'none', letterSpacing: 0 }}>Minimum 8 characters</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label className="type-ui" style={{ fontWeight: 500 }}>Confirm New Password</label>
            <input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              style={{ backgroundColor: 'transparent', border: '1px solid var(--border-medium)' }} />
          </div>

          <button className="btn btn-primary" onClick={handleChangePassword}
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            style={{ padding: '0 var(--space-8)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: 'fit-content' }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Shield size={14} />}
            Change Password
          </button>
        </div>
      </section>
    </div>
  );
}
