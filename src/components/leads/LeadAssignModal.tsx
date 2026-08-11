import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, UserCheck, Search, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { leadService } from '../../services/lead.service';
import { userService, TenantUser } from '../../services/user.service';
import { permissionService } from '../../services/permission.service';
import type { Department } from '../../types';

interface LeadAssignModalProps {
  selectedIds: Set<string>;
  onSuccess: () => void;
  onClose: () => void;
}

type Mode = 'MANUAL' | 'AUTO';

export function LeadAssignModal({ selectedIds, onSuccess, onClose }: LeadAssignModalProps) {
  const leadIds = Array.from(selectedIds);

  const [mode, setMode] = useState<Mode>('MANUAL');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Reset preview when department changes
  useEffect(() => { setPreviewLoaded(false); }, [selectedDept]);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.listAll(),
    staleTime: 60_000,
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => permissionService.getDepartments(),
    staleTime: 60_000,
  });

  const activeUsers = users.filter(u => u.status === 'ACTIVE');
  const filtered = search.trim()
    ? activeUsers.filter(u => {
        const name = `${u.firstName ?? ''} ${u.lastName ?? ''} ${u.email}`.toLowerCase();
        return name.includes(search.toLowerCase());
      })
    : activeUsers;

  const previewQuery = useQuery({
    queryKey: ['lead-assign-preview', leadIds.join(','), selectedDept?.id],
    queryFn: () => leadService.previewAutoAssign({ leadIds, departmentId: selectedDept!.id }),
    enabled: previewLoaded && !!selectedDept,
    staleTime: 0,
  });

  const assignMutation = useMutation({
    mutationFn: (payload: Parameters<typeof leadService.bulkAssign>[0]) => leadService.bulkAssign(payload),
    onSuccess: (data) => {
      toast.success(`${data.count} lead${data.count !== 1 ? 's' : ''} assigned successfully.`);
      onSuccess();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to assign leads.';
      toast.error(msg);
    },
  });

  const handleManualAssign = useCallback(() => {
    if (!selectedUser) return;
    assignMutation.mutate({ leadIds, mode: 'MANUAL', userId: selectedUser.id });
  }, [selectedUser, leadIds, assignMutation]);

  const handleAutoAssign = useCallback(() => {
    if (!selectedDept) return;
    assignMutation.mutate({ leadIds, mode: 'AUTO', departmentId: selectedDept.id });
  }, [selectedDept, leadIds, assignMutation]);

  const preview = previewQuery.data;
  const noEligible = previewLoaded && preview && preview.employees.length === 0;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget && !assignMutation.isPending) onClose(); }}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: '0.875rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={15} color="#6366f1" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Assign Leads</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>{leadIds.length} selected</p>
            </div>
          </div>
          <button onClick={onClose} disabled={assignMutation.isPending} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8', borderRadius: 4, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 1.5rem' }}>
          {(['MANUAL', 'AUTO'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0.75rem 0', marginRight: '1.5rem',
                fontSize: '0.8125rem', fontWeight: 600,
                color: mode === m ? '#6366f1' : '#94a3b8',
                borderBottom: mode === m ? '2px solid #6366f1' : '2px solid transparent',
                transition: 'all 150ms',
              }}
            >
              {m === 'MANUAL' ? 'Manual' : 'Auto Assign'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {mode === 'MANUAL' ? (
            <>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.875rem' }}>
                Assign all {leadIds.length} selected leads to one employee.
              </p>
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  autoFocus
                  placeholder="Search employees…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                {filtered.length === 0 ? (
                  <p style={{ fontSize: '0.8125rem', color: '#94a3b8', padding: '1rem', textAlign: 'center' }}>No active employees found.</p>
                ) : filtered.map(u => {
                  const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
                  const isSelected = selectedUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
                        padding: '0.625rem 0.875rem', border: 'none', cursor: 'pointer', textAlign: 'left',
                        background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 100ms',
                      }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: isSelected ? '#6366f1' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Users size={13} color={isSelected ? '#fff' : '#64748b'} />
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                      </div>
                      {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.875rem' }}>
                Distribute selected leads intelligently based on current workload.
              </p>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Department</label>
              <select
                value={selectedDept?.id ?? ''}
                onChange={e => {
                  const dept = departments.find(d => d.id === e.target.value) ?? null;
                  setSelectedDept(dept);
                }}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.8125rem', color: '#0f172a', outline: 'none', marginBottom: '0.875rem', background: '#fff' }}
              >
                <option value="">Select department…</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>

              {selectedDept && !previewLoaded && (
                <button
                  onClick={() => setPreviewLoaded(true)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', cursor: 'pointer' }}
                >
                  Preview Distribution
                </button>
              )}

              {previewLoaded && previewQuery.isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '1rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Computing distribution…
                </div>
              )}

              {noEligible && (
                <div style={{ padding: '0.875rem', borderRadius: '0.5rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.8125rem', color: '#92400e' }}>
                  No eligible active employees in this department. Ensure members are active and belong to this department.
                </div>
              )}

              {preview && preview.employees.length > 0 && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 44px 64px', padding: '0.5rem 0.875rem', background: '#f8fafc', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <span>Employee</span>
                    <span style={{ textAlign: 'right' }}>Current</span>
                    <span style={{ textAlign: 'right' }}>+</span>
                    <span style={{ textAlign: 'right' }}>Final</span>
                  </div>
                  {preview.employees.map(emp => {
                    const name = [emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.id;
                    return (
                      <div key={emp.id} style={{ display: 'grid', gridTemplateColumns: '1fr 64px 44px 64px', padding: '0.625rem 0.875rem', borderTop: '1px solid #f1f5f9', fontSize: '0.8125rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                        <span style={{ textAlign: 'right', color: '#64748b' }}>{emp.currentWorkload}</span>
                        <span style={{ textAlign: 'right', color: emp.delta > 0 ? '#059669' : '#94a3b8', fontWeight: 600 }}>+{emp.delta}</span>
                        <span style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{emp.currentWorkload + emp.delta}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0' }}>
          <button onClick={onClose} disabled={assignMutation.isPending} style={{ padding: '0.4375rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          {mode === 'MANUAL' ? (
            <button
              onClick={handleManualAssign}
              disabled={!selectedUser || assignMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4375rem 1rem', borderRadius: '0.5rem', border: 'none', background: selectedUser && !assignMutation.isPending ? '#6366f1' : '#c7d2fe', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: selectedUser && !assignMutation.isPending ? 'pointer' : 'not-allowed', transition: 'background 150ms' }}
            >
              {assignMutation.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCheck size={13} />}
              {assignMutation.isPending ? 'Assigning…' : `Assign ${leadIds.length} Lead${leadIds.length !== 1 ? 's' : ''}`}
            </button>
          ) : (
            <button
              onClick={handleAutoAssign}
              disabled={!selectedDept || noEligible || previewQuery.isLoading || assignMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4375rem 1rem', borderRadius: '0.5rem', border: 'none', background: (selectedDept && !noEligible && !previewQuery.isLoading && !assignMutation.isPending) ? '#6366f1' : '#c7d2fe', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: (selectedDept && !noEligible && !previewQuery.isLoading && !assignMutation.isPending) ? 'pointer' : 'not-allowed', transition: 'background 150ms' }}
            >
              {assignMutation.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCheck size={13} />}
              {assignMutation.isPending ? 'Assigning…' : `Auto Assign ${leadIds.length} Lead${leadIds.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
