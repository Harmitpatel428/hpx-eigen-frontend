import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Check, Users, Clock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { PORTAL_AUTH } from '../../domain/portal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PortalSettings {
  portalEnabled: boolean;
  clientVisibleDocsEnabled: boolean;
  requireManagerApproval: boolean;
  sessionDurationMinutes: number;
  maxFailedAttempts: number;
  lockoutMinutes: number;
}

const DEFAULT_SETTINGS: PortalSettings = {
  portalEnabled: false,
  clientVisibleDocsEnabled: true,
  requireManagerApproval: true,
  sessionDurationMinutes: PORTAL_AUTH.SESSION_MINUTES,
  maxFailedAttempts: PORTAL_AUTH.MAX_ATTEMPTS,
  lockoutMinutes: PORTAL_AUTH.LOCKOUT_MINUTES,
};

// ── Toggle card ────────────────────────────────────────────────────────────────

function ToggleCard({
  title, description, enabled, onChange, disabled,
}: {
  title: string; description: string; enabled: boolean;
  onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px', borderRadius: 10,
      border: `1px solid ${enabled ? '#7C3AED' : 'var(--border-medium)'}`,
      background: enabled ? 'rgba(124,58,237,0.03)' : 'var(--bg-subtle)',
      maxWidth: 520,
      transition: 'border-color 0.15s, background 0.15s',
    }}>
      <div style={{ flex: 1, marginRight: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {description}
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        role="switch"
        aria-checked={enabled}
        style={{
          position: 'relative', width: 44, height: 24, borderRadius: 999,
          border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          background: enabled ? '#7C3AED' : '#cbd5e1',
          transition: 'background 0.15s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: enabled ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}

// ── Select row ────────────────────────────────────────────────────────────────

function SelectRow({ label, value, options, onChange, disabled }: {
  label: string;
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="input"
        style={{
          backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-medium)',
          borderRadius: 8, fontSize: 13, fontWeight: 500, height: 36,
          paddingInline: 10, cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ClientPortalSettings() {
  const qc = useQueryClient();

  const { data: saved, isLoading } = useQuery<PortalSettings>({
    queryKey: ['portal-settings'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/settings/portal');
        return (res.data as any).data ?? DEFAULT_SETTINGS;
      } catch {
        return DEFAULT_SETTINGS;
      }
    },
    staleTime: 60_000,
  });

  const [local, setLocal] = useState<PortalSettings | null>(null);
  const settings = local ?? saved ?? DEFAULT_SETTINGS;

  const patch = (partial: Partial<PortalSettings>) => setLocal(s => ({ ...(s ?? settings), ...partial }));

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (data: PortalSettings) => api.put('/api/v1/settings/portal', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-settings'] });
      setLocal(null);
      toast.success('Portal settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const isDirty = local !== null;

  if (isLoading) return (
    <div style={{ paddingTop: 'var(--space-12)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--text-tertiary)' }}>
      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
      <span className="type-body">Loading…</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
      <section>
        <h2 className="type-h1" style={{ marginBottom: 'var(--space-2)' }}>Client Portal</h2>
        <p className="type-body" style={{ marginBottom: 'var(--space-8)', color: 'var(--text-secondary)' }}>
          Configure the self-service portal that lets clients check their case status, view documents, and receive updates. Authentication uses Case ID + last 4 digits of phone — no codes are sent.
        </p>

        {/* Toggle cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
          <ToggleCard
            title={`Portal: ${settings.portalEnabled ? 'ON' : 'OFF'}`}
            description="When enabled, qualifying cases can activate client portal access."
            enabled={settings.portalEnabled}
            onChange={v => patch({ portalEnabled: v })}
          />
          <ToggleCard
            title={`Client-visible documents: ${settings.clientVisibleDocsEnabled ? 'ON' : 'OFF'}`}
            description="Agents can mark individual notes and documents as visible to the client."
            enabled={settings.clientVisibleDocsEnabled}
            onChange={v => patch({ clientVisibleDocsEnabled: v })}
          />
          <ToggleCard
            title={`Manager approval for contact changes: ${settings.requireManagerApproval ? 'ON' : 'OFF'}`}
            description="Changing the portal phone number requires manager or admin approval. Sessions are revoked on approval."
            enabled={settings.requireManagerApproval}
            onChange={v => patch({ requireManagerApproval: v })}
          />
        </div>

        {/* Security grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)',
          maxWidth: 520, marginBottom: 'var(--space-8)',
        }}>
          <SelectRow
            label="Verification method"
            value="case-id-phone"
            options={[{ value: 'case-id-phone', label: 'Case ID + phone last-4' }]}
            onChange={() => {}}
            disabled
          />
          <SelectRow
            label="Session duration"
            value={settings.sessionDurationMinutes}
            options={[
              { value: 15, label: '15 minutes' },
              { value: 30, label: '30 minutes' },
              { value: 60, label: '1 hour' },
            ]}
            onChange={v => patch({ sessionDurationMinutes: Number(v) })}
          />
          <SelectRow
            label="Failed attempt limit"
            value={settings.maxFailedAttempts}
            options={[
              { value: 3, label: '3 attempts' },
              { value: 5, label: '5 attempts' },
              { value: 10, label: '10 attempts' },
            ]}
            onChange={v => patch({ maxFailedAttempts: Number(v) })}
          />
          <SelectRow
            label="Lockout duration"
            value={settings.lockoutMinutes}
            options={[
              { value: 15, label: '15 minutes' },
              { value: 30, label: '30 minutes' },
              { value: 60, label: '1 hour' },
            ]}
            onChange={v => patch({ lockoutMinutes: Number(v) })}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={() => save(settings)}
          disabled={saving || !isDirty}
          style={{
            borderRadius: 999, paddingInline: 'var(--space-8)',
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            opacity: isDirty ? 1 : 0.5,
          }}
        >
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
          Save Changes
        </button>
      </section>

      {/* Client access section */}
      <section>
        <h3 className="type-h2" style={{ marginBottom: 'var(--space-2)' }}>Client Access</h3>
        <p className="type-body" style={{ marginBottom: 'var(--space-6)', color: 'var(--text-secondary)' }}>
          Overview of active portal sessions across all cases.
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
          {[
            { icon: Users, label: 'Active sessions', value: '—' },
            { icon: Clock, label: 'Avg session length', value: '—' },
            { icon: Shield, label: 'Auth failures (24h)', value: '—' },
          ].map(stat => (
            <div key={stat.label} style={{
              padding: '14px 18px', borderRadius: 12,
              border: '1px solid var(--border-medium)', background: 'var(--bg-subtle)',
              minWidth: 140,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <stat.icon size={13} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {stat.label}
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn"
          style={{ fontSize: 12, fontWeight: 600, borderRadius: 8, paddingInline: 14, height: 34 }}
          onClick={() => toast.info('Session management coming soon')}
        >
          View active sessions
        </button>
      </section>
    </div>
  );
}
