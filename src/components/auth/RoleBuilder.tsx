import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, X, ChevronRight, Loader2, Copy } from 'lucide-react';
import { permissionService } from '../../services/permission.service';
import type { Role } from '../../types';

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
  btn: (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    border: variant === 'ghost' ? '1px solid #e2e8f0' : 'none',
    transition: 'all 120ms ease',
    background:
      variant === 'primary' ? '#0f172a' :
      variant === 'danger'  ? '#fef2f2' : '#ffffff',
    color:
      variant === 'primary' ? '#ffffff' :
      variant === 'danger'  ? '#dc2626' : '#374151',
  }),
  input: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    color: '#0f172a',
    outline: 'none',
    background: '#ffffff',
    transition: 'border-color 120ms ease',
  } as React.CSSProperties,
};

interface RoleBuilderProps {
  selectedRoleId: string | null;
  onSelectRole: (roleId: string | null) => void;
}

export function RoleBuilder({ selectedRoleId, onSelectRole }: RoleBuilderProps) {
  const qc = useQueryClient();
  const [newRoleName, setNewRoleName] = useState('');
  const [showNewRole, setShowNewRole] = useState(false);
  const [cloning, setCloning] = useState<string | null>(null);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => permissionService.getRoles(),
  });

  const createRoleMutation = useMutation({
    mutationFn: (name: string) => permissionService.createRole(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      setNewRoleName('');
      setShowNewRole(false);
    },
  });

  const handleClone = async (role: Role) => {
    setCloning(role.id);
    try {
      const newRole = await permissionService.cloneRole(role.id);
      qc.invalidateQueries({ queryKey: ['roles'] });
      onSelectRole(newRole.id);
    } catch (err) {
      console.error('Failed to clone role:', err);
    } finally {
      setCloning(null);
    }
  };

  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Roles</span>
        <button style={S.btn('ghost')} onClick={() => setShowNewRole(true)}>
          <Plus size={14} /> New
        </button>
      </div>
      <div style={{ padding: 8 }}>
        {showNewRole && (
          <div style={{ display: 'flex', gap: 6, padding: '8px 4px', borderBottom: '1px solid #f1f5f9', marginBottom: 4 }}>
            <input
              style={{ ...S.input, padding: '7px 10px', fontSize: 13 }}
              placeholder="Role name…"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newRoleName.trim()) createRoleMutation.mutate(newRoleName.trim());
                if (e.key === 'Escape') { setShowNewRole(false); setNewRoleName(''); }
              }}
              autoFocus
            />
            <button style={S.btn('primary')} onClick={() => newRoleName.trim() && createRoleMutation.mutate(newRoleName.trim())}>
              <Check size={13} />
            </button>
            <button style={S.btn('ghost')} onClick={() => { setShowNewRole(false); setNewRoleName(''); }}>
              <X size={13} />
            </button>
          </div>
        )}
        {rolesLoading && (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        {roles.map((role: Role) => (
          <div
            key={role.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              background: selectedRoleId === role.id ? '#f8fafc' : 'transparent',
              transition: 'background 120ms',
            }}
            onClick={() => onSelectRole(role.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
              <span style={{ fontSize: 14, fontWeight: selectedRoleId === role.id ? 500 : 400, color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{role.name}</span>
              {role._count?.users != null && (
                <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{role._count.users}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {role.isSystem && (
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                  SYSTEM
                </span>
              )}
              <button
                title="Duplicate role"
                onClick={e => { e.stopPropagation(); handleClone(role); }}
                disabled={cloning === role.id}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8', borderRadius: 4, display: 'flex', alignItems: 'center' }}
              >
                {cloning === role.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Copy size={13} />}
              </button>
              <ChevronRight size={14} style={{ color: '#94a3b8' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
