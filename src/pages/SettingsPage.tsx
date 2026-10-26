import { useState, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Building2, Bell, Shield, Key, CreditCard, Users, Loader2, Check, Lock, FileText, BarChart3, SlidersHorizontal, Folder, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react';
import { useCollapsed } from '../hooks/useCollapsed';
import { LeadIdentitySettings } from './settings/LeadIdentitySettings';
import { MembersSettings } from './settings/MembersSettings';
import { OrgManagement } from './settings/OrgManagement';
import { ClientPortalSettings } from './settings/ClientPortalSettings';
import { ReminderSettingsModal } from '../components/documentation/ReminderSettingsModal';
// Relocated into Settings tabs; lazy-loaded (ProtectedApp idiom) so the heavy
// Configuration builders don't bloat the Settings chunk.
const ReportsPage = lazy(() => import('./ReportsPage').then(m => ({ default: m.ReportsPage })));
const ConfigurationPage = lazy(() => import('./ConfigurationPage').then(m => ({ default: m.ConfigurationPage })));
import { useAuth } from '../auth/public';
import { useCaseEngineSettings } from '../hooks/useCaseFields';
import { api } from '../services/api';
import { crmSettingsService } from '../services/crm-settings.service';
import { DEFAULT_TEMPLATE, DEFAULT_ORG_NAME } from '../utils/pendingReminder';
import { loadColourfulFilters, saveColourfulFilters } from '../utils/salesDashboardPrefs';
import { toast } from '../components/notifications/notify';

// Shared label + icon lookup so the expanded groups and the collapsed icon rail
// render the same tab identically (single source — no triplicated markup).
const TAB_LABELS: Record<string, string> = {
  profile: 'Profile', notifications: 'Notifications', security: 'Security',
  general: 'General', members: 'Members', 'org-management': 'Organization Management',
  billing: 'Billing', 'client-portal': 'Client Portal',
  'documentation-setting': 'Documentation Setting', reports: 'Reports', configuration: 'Configuration',
};
const TAB_ICONS: Record<string, LucideIcon> = {
  profile: User, notifications: Bell, security: Shield,
  general: Building2, members: Key, 'org-management': Users, billing: CreditCard, 'client-portal': Lock,
  'documentation-setting': FileText, reports: BarChart3, configuration: SlidersHorizontal,
};

function SettingsTabButton({ tab, active, collapsed, onClick }: { tab: string; active: boolean; collapsed: boolean; onClick: () => void }) {
  const Icon = TAB_ICONS[tab];
  const label = TAB_LABELS[tab] ?? tab;
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className="type-ui"
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '10px 0' : '8px var(--space-3)', borderRadius: 'var(--radius-md)',
        backgroundColor: active ? 'var(--bg-app)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: active ? 500 : 400,
        boxShadow: active ? '0 1px 2px rgba(0,0,0,0.02)' : 'none',
        transition: 'all var(--transition-fast)',
      }}
    >
      {Icon && <Icon size={16} />}
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [docOpen, setDocOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useCollapsed('hpx:ui:v1:settingsNavCollapsed');
  const [showPulse, setShowPulse] = useState<boolean>(() => {
    try { return localStorage.getItem('hpx:ui:v1:settingsNavPulseShown') !== '1'; } catch { return false; }
  });
  const dismissPulse = () => {
    setShowPulse(false);
    try { localStorage.setItem('hpx:ui:v1:settingsNavPulseShown', '1'); } catch { /* storage unavailable */ }
  };
  const { user, permissions, refreshUser } = useAuth();
  const { data: engineSettings } = useCaseEngineSettings();

  // Same gates that previously controlled these controls (sidebar + buttons) —
  // relocation grants no new access.
  const canReminder = permissions.can('role:manage');
  const canReports = permissions.can('doc:view') && !!engineSettings?.caseOperationsEngineEnabled;
  const canConfig =
    permissions.can('case-engine:manage') ||
    (!!engineSettings?.caseOperationsEngineEnabled && permissions.canAny(['case-field:view', 'case-type:view']));

  const workspaceTabs = [
    'general',
    ...(permissions.can('user:view') ? ['members'] : []),
    ...(permissions.can('role:manage') ? ['org-management'] : []),
    'billing',
    'client-portal',
  ];

  // "Document" group — the relocated controls, each behind its original gate.
  const documentTabs = [
    ...(canReminder ? ['documentation-setting'] : []),
    ...(canReports ? ['reports'] : []),
    ...(canConfig ? ['configuration'] : []),
  ];

  // Embedded full pages (Configuration/Reports) render their own 240px sub-nav,
  // so they need the full width or they get squeezed. Keep org-management at 1280.
  const maxW = (activeTab === 'configuration' || activeTab === 'reports')
    ? 'none'
    : (activeTab === 'org-management' ? 1280 : 1000);

  return (
    <div style={{ display: 'flex', gap: 'var(--space-16)', maxWidth: maxW }}>
      {/* Sidebar — collapsible 64px icon rail; nav scrolls, fixed-size toggle in the top header row */}
      <div className="nav-collapsible" style={{ width: navCollapsed ? 64 : 240, flexShrink: 0, position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: navCollapsed ? 'center' : 'space-between', flexShrink: 0, marginBottom: 'var(--space-6)', minHeight: 40 }}>
          {!navCollapsed && <h1 className="type-h1" style={{ margin: 0 }}>Settings</h1>}
          <button
            onClick={() => { setNavCollapsed(!navCollapsed); if (showPulse) dismissPulse(); }}
            onAnimationEnd={showPulse ? dismissPulse : undefined}
            aria-expanded={!navCollapsed}
            aria-controls="settings-nav"
            aria-label={navCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
            title={navCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
            className={`btn btn-ghost${showPulse ? ' nav-toggle-pulse' : ''}`}
            style={{ width: 40, height: 40, minWidth: 40, minHeight: 40, flexShrink: 0, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {navCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav id="settings-nav" style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {navCollapsed ? (
            // Flat icon rail: every tab (incl. the Documentation group's items) as an
            // icon + tooltip; headings/chevron omitted. Nav + active highlight preserved.
            ['profile', 'notifications', 'security', ...workspaceTabs, ...documentTabs].map(tab => (
              <SettingsTabButton key={tab} tab={tab} active={activeTab === tab} collapsed onClick={() => setActiveTab(tab)} />
            ))
          ) : (
            <>
              <div className="type-micro" style={{ padding: '0 var(--space-3)', marginBottom: 'var(--space-2)' }}>Personal</div>
              {['profile', 'notifications', 'security'].map(tab => (
                <SettingsTabButton key={tab} tab={tab} active={activeTab === tab} collapsed={false} onClick={() => setActiveTab(tab)} />
              ))}

              <div className="type-micro" style={{ padding: '0 var(--space-3)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)' }}>Workspace</div>
              {workspaceTabs.map(tab => (
                <SettingsTabButton key={tab} tab={tab} active={activeTab === tab} collapsed={false} onClick={() => setActiveTab(tab)} />
              ))}

              {documentTabs.length > 0 && (
                <>
                  {/* Collapsible "Documentation" group — Departments idiom. */}
                  <button
                    onClick={() => setDocOpen(o => !o)}
                    aria-expanded={docOpen}
                    className="type-ui"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      marginTop: 'var(--space-6)',
                      padding: '8px var(--space-3)', borderRadius: 'var(--radius-md)',
                      backgroundColor: documentTabs.includes(activeTab) ? 'var(--bg-app)' : 'transparent',
                      color: documentTabs.includes(activeTab) ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: documentTabs.includes(activeTab) ? 500 : 400,
                      boxShadow: documentTabs.includes(activeTab) ? '0 1px 2px rgba(0,0,0,0.02)' : 'none',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <Folder size={16} />
                    <span style={{ flex: 1, textAlign: 'left' }}>Documentation</span>
                    {docOpen ? <ChevronDown size={14} style={{ opacity: 0.5 }} /> : <ChevronRight size={14} style={{ opacity: 0.5 }} />}
                  </button>
                  {docOpen && (
                    <div style={{ paddingLeft: 16 }}>
                      {documentTabs.map(tab => (
                        <SettingsTabButton key={tab} tab={tab} active={activeTab === tab} collapsed={false} onClick={() => setActiveTab(tab)} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </nav>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: 'var(--space-24)', marginTop: 72 }}>
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
            <ProfileTab user={user} onSaved={refreshUser} />
            <SalesDashboardSettings />
          </div>
        )}

        {activeTab === 'security' && <SecurityTab />}

        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
            <section>
              <h2 className="type-h1" style={{ marginBottom: 'var(--space-2)' }}>General</h2>
              <p className="type-body" style={{ marginBottom: 'var(--space-8)', color: 'var(--text-secondary)' }}>Organization-wide workspace settings.</p>
            </section>
            <LeadIdentitySettings />
            <AdminAccountAccessSettings />
          </div>
        )}

        {activeTab === 'members' && <MembersSettings />}

        {activeTab === 'org-management' && <OrgManagement />}

        {activeTab === 'client-portal' && <ClientPortalSettings />}

        {activeTab === 'documentation-setting' && <DocumentationSettingTab onDone={() => setActiveTab('general')} />}

        {activeTab === 'reports' && (
          <Suspense fallback={<Loader2 className="animate-spin" size={20} />}><ReportsPage /></Suspense>
        )}

        {activeTab === 'configuration' && (
          <Suspense fallback={<Loader2 className="animate-spin" size={20} />}><ConfigurationPage /></Suspense>
        )}

        {!['profile', 'general', 'members', 'org-management', 'security', 'client-portal', 'documentation-setting', 'reports', 'configuration'].includes(activeTab) && (
          <div style={{ padding: 'var(--space-24) 0', textAlign: 'center' }}>
            <h2 className="type-title" style={{ marginBottom: 'var(--space-2)' }}>Coming Soon</h2>
            <p className="type-body" style={{ color: 'var(--text-tertiary)' }}>This settings panel is being rebuilt.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Documentation Setting tab (reminder template) ────────────────
// Reuses the existing ReminderSettingsModal as-is; closing or saving returns
// to the General tab. Gated by role:manage via the sidebar item.

function DocumentationSettingTab({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const { data: crm } = useQuery({ queryKey: ['crm-settings'], queryFn: () => crmSettingsService.get() });
  return (
    <ReminderSettingsModal
      initialTemplate={crm?.pendingReminderTemplate ?? DEFAULT_TEMPLATE}
      initialOrgName={crm?.pendingReminderOrgName ?? DEFAULT_ORG_NAME}
      pendingNames={[]}
      onClose={onDone}
      onSaved={() => { qc.invalidateQueries({ queryKey: ['crm-settings'] }); onDone(); }}
    />
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

// ─── Sales Dashboard (personal UI preferences) ────────────────────

function SalesDashboardSettings() {
  const [colourful, setColourful] = useState(() => loadColourfulFilters());

  const toggle = () => {
    const next = !colourful;
    setColourful(next);
    saveColourfulFilters(next);
    toast.success(next ? 'Colourful filters enabled' : 'Colourful filters disabled');
  };

  return (
    <section>
      <h2 className="type-h1" style={{ marginBottom: 'var(--space-2)' }}>Sales Dashboard</h2>
      <p className="type-body" style={{ marginBottom: 'var(--space-8)', color: 'var(--text-secondary)' }}>
        Personal display preferences for the Sales Dashboard.
      </p>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: 10,
        border: `1px solid ${colourful ? '#0f172a' : 'var(--border-medium)'}`,
        background: colourful ? 'rgba(15,23,42,0.03)' : 'var(--bg-subtle)',
        maxWidth: 420,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            Colourful Filters: {colourful ? 'ON' : 'OFF'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {colourful ? 'Stage pills use their stage colours.' : 'Clean, minimal pill styling.'}
          </div>
        </div>
        <button
          onClick={toggle}
          style={{
            position: 'relative', width: 44, height: 24, borderRadius: 999,
            border: 'none', cursor: 'pointer',
            background: colourful ? '#0f172a' : '#cbd5e1',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
          role="switch"
          aria-checked={colourful}
          aria-label="Toggle colourful status pill filters"
        >
          <span style={{
            position: 'absolute', top: 3, left: colourful ? 23 : 3,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>
    </section>
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

// ─── Admin Account Access Settings ────────────────────────────────
// Allows authorized admins (role:manage) to toggle whether admins can
// click the assigned-person badge in the Leads table to enter a user's account.

function AdminAccountAccessSettings() {
  const qc = useQueryClient();
  const { permissions } = useAuth();
  const canManage = permissions.can('role:manage');

  const { data, isLoading } = useQuery({
    queryKey: ['crm-settings'],
    queryFn: () => crmSettingsService.get(),
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: (enabled: boolean) => crmSettingsService.setImpersonation(enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-settings'] });
      toast.success('Setting saved');
    },
    onError: () => toast.error('Failed to save setting'),
  });

  if (isLoading) return null;

  const enabled = data?.allowImpersonation ?? false;

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
        Administrative Account Access
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
        When enabled, authorized administrators can click the assigned-person badge on a lead to view that user's account. All access events are audited. The API enforces this setting independently of the UI.
      </p>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: 10,
        border: `1px solid ${enabled ? '#0f172a' : 'var(--border-medium)'}`,
        background: enabled ? 'rgba(15,23,42,0.03)' : 'var(--bg-subtle)',
        maxWidth: 420,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            {enabled ? 'Enabled' : 'Disabled'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {enabled ? "Admins can enter any assigned user's account." : "Badge is visible but access is blocked server-side."}
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => mutation.mutate(!enabled)}
            disabled={mutation.isPending}
            style={{
              position: 'relative', width: 44, height: 24, borderRadius: 999,
              border: 'none', cursor: mutation.isPending ? 'not-allowed' : 'pointer',
              background: enabled ? '#0f172a' : '#cbd5e1',
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
            aria-label={enabled ? 'Disable administrative account access' : 'Enable administrative account access'}
          >
            <span style={{
              position: 'absolute', top: 3, left: enabled ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        )}
      </div>
    </div>
  );
}
