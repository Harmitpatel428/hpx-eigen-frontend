import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../auth/public';
import { crmSettingsService, type LeadHeaderPreference } from '../../services/crm-settings.service';

const OPTIONS: { value: LeadHeaderPreference; label: string; description: string }[] = [
  { value: 'name',    label: 'Name',    description: "Display the lead's first and last name (e.g. Harmit Patel)." },
  { value: 'company', label: 'Company', description: "Display the lead's company name (e.g. HPX Eigen)." },
];

export function LeadIdentitySettings() {
  const qc = useQueryClient();
  const { permissions } = useAuth();
  const canManage = permissions.can('role:manage');

  const { data, isLoading } = useQuery({
    queryKey: ['crm-settings'],
    queryFn: () => crmSettingsService.get(),
    staleTime: 5 * 60 * 1000,
  });

  const pref = data?.leadHeaderPreference ?? 'name';
  const [selected, setSelected] = useState<LeadHeaderPreference>(pref);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(data?.leadHeaderPreference ?? 'name');
  }, [data?.leadHeaderPreference]);

  const mutation = useMutation({
    mutationFn: (p: LeadHeaderPreference) => crmSettingsService.setLeadHeaderPreference(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-settings'] });
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to save. Please try again.');
    },
  });

  if (isLoading) {
    return <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div>;
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
        Lead Header Identity
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
        Controls the primary identifier shown in the Lead Info modal header across your organization. This setting applies uniformly to all members.
      </p>

      {canManage ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {OPTIONS.map(opt => (
              <label
                key={opt.value}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${selected === opt.value ? '#0f172a' : 'var(--border-medium)'}`,
                  background: selected === opt.value ? 'rgba(15,23,42,0.03)' : 'var(--bg-subtle)',
                  transition: 'border-color 0.12s, background 0.12s',
                }}
              >
                <input
                  type="radio"
                  name="lead-header-pref"
                  value={opt.value}
                  checked={selected === opt.value}
                  onChange={() => { setSelected(opt.value); setError(null); setSaved(false); }}
                  style={{ marginTop: 2, accentColor: '#0f172a' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {opt.description}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
              marginBottom: 12, fontSize: 12, color: '#dc2626',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selected !== pref && (
              <button
                onClick={() => mutation.mutate(selected)}
                disabled={mutation.isPending}
                style={{
                  padding: '8px 20px', borderRadius: 8,
                  background: '#0f172a', color: '#fff', border: 'none',
                  fontSize: 13, fontWeight: 600,
                  cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: mutation.isPending ? 0.7 : 1,
                }}
              >
                {mutation.isPending ? 'Saving…' : 'Save'}
              </button>
            )}
            {saved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#059669' }}>
                <CheckCircle2 size={14} />
                Saved
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          border: '1px solid var(--border-medium)',
          background: 'var(--bg-subtle)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>
            Current organization setting
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {OPTIONS.find(o => o.value === pref)?.label ?? pref}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Managed by your organization administrator.
          </div>
        </div>
      )}
    </div>
  );
}
