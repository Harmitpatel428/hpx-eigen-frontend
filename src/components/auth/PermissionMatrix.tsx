import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Shield } from 'lucide-react';
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

const MODULES_ORDER = ['Leads', 'Contacts', 'Opportunities', 'Activities', 'Invoices', 'Payments', 'Admin'];
const ACTION_MAP: Record<string, string[]> = {
  Leads:         ['lead:view', 'lead:create', 'lead:edit', 'lead:delete', 'lead:assign'],
  Contacts:      ['contact:view', 'contact:create', 'contact:edit', 'contact:delete'],
  Opportunities: ['opportunity:view', 'opportunity:create', 'opportunity:edit', 'opportunity:delete'],
  Activities:    ['activity:view', 'activity:create', 'activity:edit', 'activity:delete'],
  Invoices:      ['invoice:view', 'invoice:create', 'invoice:edit', 'invoice:delete'],
  Payments:      ['payment:view', 'payment:create', 'payment:edit'],
  Admin:         ['role:view', 'role:manage', 'user:view', 'user:manage', 'department:view', 'department:manage', 'team:view', 'team:manage'],
};

interface PermissionMatrixProps {
  selectedRoleId: string | null;
}

export function PermissionMatrix({ selectedRoleId }: PermissionMatrixProps) {
  const qc = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => permissionService.getRoles(),
  });

  const { data: allPerms = [] } = useQuery({
    queryKey: ['permissions', 'all'],
    queryFn: () => permissionService.getAllPermissions(),
  });

  const { data: rolePerms = [], isLoading: rolePermsLoading } = useQuery({
    queryKey: ['role-permissions', selectedRoleId],
    queryFn: () => permissionService.getRolePermissions(selectedRoleId!),
    enabled: !!selectedRoleId,
  });

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

  if (!selectedRoleId) {
    return (
      <div style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, minHeight: 300, color: '#94a3b8' }}>
        <Shield size={32} style={{ opacity: 0.4 }} />
        <p style={{ fontSize: 14 }}>Select a role to edit permissions</p>
      </div>
    );
  }

  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
            Permission Matrix — {roles.find((r: Role) => r.id === selectedRoleId)?.name}
          </span>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            Toggle permissions for this role. Changes apply immediately.
          </p>
        </div>
        {(addPermMutation.isPending || removePermMutation.isPending) && (
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#64748b' }} />
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        {rolePermsLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                  Module
                </th>
                {['View', 'Create', 'Edit', 'Delete', 'Assign', 'Manage'].map((action) => (
                  <th key={action} style={{ padding: '10px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', minWidth: 72 }}>
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES_ORDER.map((module, mi) => {
                const moduleSlugs = ACTION_MAP[module] ?? [];
                const actionCols = ['view', 'create', 'edit', 'delete', 'assign', 'manage'];
                return (
                  <tr key={module} style={{ borderBottom: mi < MODULES_ORDER.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#374151' }}>
                      {module}
                    </td>
                    {actionCols.map((action) => {
                      const slug = moduleSlugs.find((s) => s.endsWith(`:${action}`));
                      const exists = !!slug;
                      const checked = exists && assignedSlugs.has(slug!);

                      return (
                        <td key={action} style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {exists ? (
                            <div
                              style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer' }}
                              onClick={() => slug && togglePermission(slug)}
                              role="checkbox"
                              aria-checked={checked}
                              aria-label={`${module} ${action}`}
                            >
                              <div style={S.checkbox(checked)}>
                                {checked && <Check size={11} color="#ffffff" strokeWidth={2.5} />}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#e2e8f0' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
