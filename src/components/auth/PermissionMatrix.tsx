import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Shield, Search, AlertCircle } from 'lucide-react';
import { permissionService } from '../../services/permission.service';
import type { Role, Permission } from '../../types';

const S = {
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
  } as React.CSSProperties,
  cardHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fafafa',
  } as React.CSSProperties,
  checkbox: (checked: boolean): React.CSSProperties => ({
    width: 18,
    height: 18,
    borderRadius: 5,
    border: checked ? 'none' : '1.5px solid #cbd5e1',
    background: checked ? '#0f172a' : '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 120ms ease',
    flexShrink: 0,
  }),
};

const MODULES_ORDER = ['Leads', 'Contacts', 'Opportunities', 'Activities', 'Invoices', 'Payments', 'Documentation', 'Admin'];

const FALLBACK_ACTION_MAP: Record<string, string[]> = {
  Leads:         ['lead:view', 'lead:create', 'lead:edit', 'lead:delete', 'lead:assign'],
  Contacts:      ['contact:view', 'contact:create', 'contact:edit', 'contact:delete'],
  Opportunities: ['opportunity:view', 'opportunity:create', 'opportunity:edit', 'opportunity:delete'],
  Activities:    ['activity:view', 'activity:create', 'activity:edit', 'activity:delete'],
  Invoices:      ['invoice:view', 'invoice:create', 'invoice:edit', 'invoice:delete'],
  Payments:      ['payment:view', 'payment:create', 'payment:edit'],
  Documentation: ['doc:view', 'doc:create', 'doc:edit', 'doc:verify', 'doc:override', 'doc:transfer', 'doc:preset:view', 'doc:preset:manage', 'doc:audit:view'],
  Admin:         ['role:view', 'role:manage', 'audit:view', 'user:view', 'user:manage', 'department:view', 'department:manage', 'team:view', 'team:manage'],
};

function slugLabel(slug: string): string {
  const action = slug.split(':').pop() ?? slug;
  return action.charAt(0).toUpperCase() + action.slice(1);
}

interface PermissionMatrixProps {
  selectedRoleId: string | null;
}

export function PermissionMatrix({ selectedRoleId }: PermissionMatrixProps) {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => permissionService.getRoles(),
  });

  const { data: allPerms = [], isLoading: permsLoading, isError: permsError } = useQuery({
    queryKey: ['permissions', 'all'],
    queryFn: () => permissionService.getAllPermissions(),
  });

  const { data: rolePerms = [], isLoading: rolePermsLoading } = useQuery({
    queryKey: ['role-permissions', selectedRoleId],
    queryFn: () => permissionService.getRolePermissions(selectedRoleId!),
    enabled: !!selectedRoleId,
  });

  const { modulesOrder, actionMap } = useMemo(() => {
    if (!allPerms.length) return { modulesOrder: MODULES_ORDER, actionMap: FALLBACK_ACTION_MAP };
    const grouped: Record<string, string[]> = {};
    for (const p of allPerms) {
      (grouped[p.module] ??= []).push(p.slug);
    }
    const known = MODULES_ORDER.filter(m => grouped[m]);
    const extra = Object.keys(grouped).filter(m => !MODULES_ORDER.includes(m)).sort();
    return { modulesOrder: [...known, ...extra], actionMap: grouped };
  }, [allPerms]);

  const addPermMutation = useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      permissionService.addRolePermission(roleId, permissionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['role-permissions', selectedRoleId] }),
  });

  const removePermMutation = useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      permissionService.removeRolePermission(roleId, permissionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['role-permissions', selectedRoleId] }),
  });

  const assignedSlugs = new Set(rolePerms.map((p: Permission) => p.slug));
  const permBySlug = Object.fromEntries(allPerms.map((p: Permission) => [p.slug, p]));

  const togglePermission = useCallback((slug: string) => {
    if (!selectedRoleId) return;
    const perm = permBySlug[slug];
    if (!perm) return;
    if (assignedSlugs.has(slug)) {
      removePermMutation.mutate({ roleId: selectedRoleId, permissionId: perm.id });
    } else {
      addPermMutation.mutate({ roleId: selectedRoleId, permissionId: perm.id });
    }
  }, [selectedRoleId, assignedSlugs, permBySlug, addPermMutation, removePermMutation]);

  const filteredModules = searchQuery
    ? modulesOrder.filter(m => {
        const q = searchQuery.toLowerCase();
        if (m.toLowerCase().includes(q)) return true;
        return (actionMap[m] ?? []).some(s => s.toLowerCase().includes(q) || slugLabel(s).toLowerCase().includes(q));
      })
    : modulesOrder;

  if (!selectedRoleId) {
    return (
      <div style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, minHeight: 300, color: '#94a3b8' }}>
        <Shield size={32} style={{ opacity: 0.4 }} />
        <p style={{ fontSize: 14 }}>Select a role to edit permissions</p>
      </div>
    );
  }

  if (permsError) {
    return (
      <div style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, minHeight: 300, color: '#dc2626' }}>
        <AlertCircle size={32} style={{ opacity: 0.6 }} />
        <p style={{ fontSize: 14 }}>Failed to load permissions. Refresh to retry.</p>
      </div>
    );
  }

  const roleName = roles.find((r: Role) => r.id === selectedRoleId)?.name;
  const assignedCount = assignedSlugs.size;
  const totalCount = Object.values(actionMap).flat().length;

  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
            {roleName} — {assignedCount}/{totalCount} permissions
          </span>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            Toggle permissions for this role. Changes apply immediately.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(addPermMutation.isPending || removePermMutation.isPending) && (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#64748b' }} />
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ position: 'relative', maxWidth: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#0f172a', outline: 'none', background: '#fff' }}
            placeholder="Search permissions…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        {(rolePermsLoading || permsLoading) ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ padding: '8px 16px 16px' }}>
            {filteredModules.map(module => {
              const slugs = actionMap[module] ?? [];
              return (
                <div key={module} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, paddingLeft: 4 }}>
                    {module}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {slugs.map(slug => {
                      const checked = assignedSlugs.has(slug);
                      return (
                        <div
                          key={slug}
                          onClick={() => togglePermission(slug)}
                          role="checkbox"
                          aria-checked={checked}
                          aria-label={`${module} ${slugLabel(slug)}`}
                          tabIndex={0}
                          onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); togglePermission(slug); } }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                            borderRadius: 8, border: `1px solid ${checked ? '#0f172a' : '#e2e8f0'}`,
                            background: checked ? 'rgba(15,23,42,0.04)' : '#fff',
                            cursor: 'pointer', transition: 'all 120ms',
                          }}
                        >
                          <div style={S.checkbox(checked)}>
                            {checked && <Check size={11} color="#ffffff" strokeWidth={2.5} />}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: checked ? 500 : 400, color: checked ? '#0f172a' : '#64748b' }}>
                            {slugLabel(slug)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {filteredModules.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No permissions match "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
