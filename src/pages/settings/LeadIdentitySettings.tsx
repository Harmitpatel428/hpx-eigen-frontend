import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Lock } from 'lucide-react';
import { crmSettingsService, type LeadHeaderPreference } from '../../services/crm-settings.service';

const OPTIONS: { value: LeadHeaderPreference; label: string; description: string }[] = [
  { value: 'name',    label: 'Name',         description: 'Display the lead\'s first and last name (e.g. Harmit Patel).' },
  { value: 'company', label: 'Company',      description: 'Display the lead\'s company (e.g. HPX Eigen).' },
  { value: 'phone',   label: 'Phone Number', description: 'Display the lead\'s primary phone number.' },
];

export function LeadIdentitySettings() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['crm-settings'],
    queryFn: () => crmSettingsService.get(),
    staleTime: Infinity,
  });

  const [selected, setSelected] = useState<LeadHeaderPreference | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (pref: LeadHeaderPreference) => crmSettingsService.setLeadHeaderPreference(pref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-settings'] });
      setConfirmed(false);
      setSelected(null);
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to save. Please try again.');
      setConfirmed(false);
    },
  });

  if (isLoading) {
    return <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div>;
  }

  const pref = data?.leadHeaderPreference ?? null;

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
        Lead Header Identity
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
        Choose what appears as the primary identity in the Lead Info header. This applies to all users in your workspace.
      </p>

      {pref != null ? (
        // Already configured — read-only display
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderRadius: 10,
          border: '1px solid var(--border-medium)',
          background: 'var(--bg-subtle)',
        }}>
          <Lock size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {OPTIONS.find(o => o.value === pref)?.label ?? pref}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              This setting is locked and cannot be changed.
            </div>
          </div>
          <CheckCircle2 size={16} style={{ color: '#059669', marginLeft: 'auto', flexShrink: 0 }} />
        </div>
      ) : (
        // Not yet configured — show selector
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
                  onChange={() => { setSelected(opt.value); setConfirmed(false); setError(null); }}
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

          {selected && !confirmed && (
            <div style={{
              padding: '12px 14px', borderRadius: 8,
              background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
              marginBottom: 12, fontSize: 12, color: '#92400e', lineHeight: 1.6,
            }}>
              <strong>Choose carefully.</strong> This setting cannot be changed after saving. All workspace users will see leads identified by their <strong>{OPTIONS.find(o => o.value === selected)?.label}</strong>.
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
              marginBottom: 12, fontSize: 12, color: '#dc2626',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {selected && !confirmed && (
              <button
                onClick={() => setConfirmed(true)}
                style={{
                  padding: '8px 20px', borderRadius: 8,
                  background: '#0f172a', color: '#fff', border: 'none',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Confirm selection
              </button>
            )}
            {selected && confirmed && (
              <button
                onClick={() => mutation.mutate(selected)}
                disabled={mutation.isPending}
                style={{
                  padding: '8px 20px', borderRadius: 8,
                  background: '#059669', color: '#fff', border: 'none',
                  fontSize: 13, fontWeight: 600,
                  cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: mutation.isPending ? 0.7 : 1,
                }}
              >
                {mutation.isPending ? 'Saving…' : 'Save — this cannot be undone'}
              </button>
            )}
            {selected && (
              <button
                onClick={() => { setSelected(null); setConfirmed(false); setError(null); }}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: 'transparent', color: 'var(--text-secondary)',
                  border: '1px solid var(--border-medium)',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
