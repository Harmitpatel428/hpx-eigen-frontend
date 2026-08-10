import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, Shield, Loader2, X, Check } from 'lucide-react';
import { useAuth } from '../../auth/public';
import { userService, type TenantUser } from '../../services/user.service';
import { permissionService } from '../../services/permission.service';
import type { Role, ScopeType } from '../../types';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ACTIVE:     { bg: 'rgba(16,185,129,0.1)',  color: '#059669' },
  SUSPENDED:  { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
  TERMINATED: { bg: 'rgba(107,114,128,0.1)', color: '#6b7280' },
  INVITED:    { bg: 'rgba(99,102,241,0.1)',  color: '#6366f1' },
  NEW:        { bg: 'rgba(245,158,11,0.1)',  color: '#d97706' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.NEW;
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function RoleBadge({ name }: { name: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: 'var(--bg-muted, #f1f5f9)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', marginRight: 4, marginBottom: 2 }}>
      {name}
    </span>
  );
}

// ─── Invite Modal ──────────────────────────────────────────────────────
function InviteModal({ roles, onClose }: { roles: Role[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');

  const invite = useMutation({
    mutationFn: () => import('../../services/api').then(m => m.api.post('/api/v1/users/invite', { email, roleId })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-users'] }); onClose(); },
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: 'var(--bg-app, #fff)', borderRadius: 16, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid var(--border-medium)' }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Invite Member</h2>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
        <input
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-medium)', fontSize: 14, color: 'var(--text-primary)', background: 'transparent', outline: 'none', marginBottom: 16 }}
          placeholder="colleague@company.com"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoFocus
        />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Role</label>
        <select
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-medium)', fontSize: 14, color: 'var(--text-primary)', background: 'transparent', cursor: 'pointer', marginBottom: 20 }}
          value={roleId}
          onChange={e => setRoleId(e.target.value)}
        >
          <option value="">Select a role…</option>
          {roles.map(r => (
            <option key={r.id} value={r.id}>{r.name}{r._count?.users != null ? ` (${r._count.users} users)` : ''}</option>
          ))}
        </select>

        {invite.isError && (
          <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>
            {(invite.error as any)?.response?.data?.error?.message || 'Failed to send invitation.'}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={() => invite.mutate()}
            disabled={!email.trim() || !roleId || invite.isPending}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 500, cursor: invite.isPending ? 'not-allowed' : 'pointer', opacity: (!email.trim() || !roleId) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {invite.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={14} />}
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Role Assignment Modal ─────────────────────────────────────────────
function RoleAssignModal({ user, roles, onClose }: { user: TenantUser; roles: Role[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [roleId, setRoleId] = useState('');
  const [scope, setScope] = useState<ScopeType>('OWN');

  const assign = useMutation({
    mutationFn: () => permissionService.assignUserRole(roleId, user.id, scope),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-users'] }); onClose(); },
  });

  const currentRoleIds = new Set((user.userRoles ?? []).map(ur => ur.role.id));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: 'var(--bg-app, #fff)', borderRadius: 16, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid var(--border-medium)' }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Assign Role</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{user.email}</p>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Role</label>
        <select
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-medium)', fontSize: 14, color: 'var(--text-primary)', background: 'transparent', cursor: 'pointer', marginBottom: 16 }}
          value={roleId}
          onChange={e => setRoleId(e.target.value)}
        >
          <option value="">Select a role…</option>
          {roles.map(r => (
            <option key={r.id} value={r.id} disabled={currentRoleIds.has(r.id)}>
              {r.name}{currentRoleIds.has(r.id) ? ' (already assigned)' : ''}
            </option>
          ))}
        </select>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Access Scope</label>
        <select
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-medium)', fontSize: 14, color: 'var(--text-primary)', background: 'transparent', cursor: 'pointer', marginBottom: 6 }}
          value={scope}
          onChange={e => setScope(e.target.value as ScopeType)}
        >
          <option value="OWN">Own — see only own records</option>
          <option value="TEAM">Team — see team records</option>
          <option value="DEPARTMENT">Department — see department records</option>
          <option value="ORGANIZATION">Organization — see all records</option>
        </select>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={() => assign.mutate()}
            disabled={!roleId || assign.isPending}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 500, cursor: assign.isPending ? 'not-allowed' : 'pointer', opacity: !roleId ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {assign.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────
export function MembersSettings() {
  const { permissions } = useAuth();
  const canManageUsers = permissions.can('user:manage');
  const canManageRoles = permissions.can('role:manage');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [assignTarget, setAssignTarget] = useState<TenantUser | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['tenant-users'],
    queryFn: () => userService.listAll(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => permissionService.getRoles(),
    enabled: canManageRoles,
  });

  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.email.toLowerCase().includes(q));
    }
    if (roleFilter) {
      list = list.filter(u => (u.userRoles ?? []).some(ur => ur.role.id === roleFilter));
    }
    return list;
  }, [users, search, roleFilter]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 className="type-h1" style={{ marginBottom: 4 }}>Members</h2>
          <p className="type-body" style={{ color: 'var(--text-secondary)' }}>
            {isLoading ? 'Loading…' : `${users.length} member${users.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => setShowInvite(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            <UserPlus size={14} /> Invite
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            style={{ width: '100%', padding: '8px 12px 8px 30px', borderRadius: 8, border: '1px solid var(--border-medium)', fontSize: 13, color: 'var(--text-primary)', background: 'transparent', outline: 'none' }}
            placeholder="Search by email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {roles.length > 0 && (
          <select
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-medium)', fontSize: 13, color: 'var(--text-primary)', background: 'transparent', cursor: 'pointer' }}
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            {roles.map((r: Role) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <p style={{ fontWeight: 500, marginBottom: 4 }}>No members found</p>
          <p style={{ fontSize: 13 }}>{search || roleFilter ? 'Try adjusting your filters.' : 'Invite your first team member.'}</p>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px minmax(140px,1fr) 100px', gap: 12, padding: '10px 16px', background: 'var(--bg-muted, #f8fafc)', borderBottom: '1px solid var(--border-light)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            <div>Member</div>
            <div>Status</div>
            <div>Roles</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>

          {/* Rows */}
          {filtered.map(user => (
            <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px minmax(140px,1fr) 100px', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-light)', alignItems: 'center', fontSize: 13 }}>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.email}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
              <div><StatusBadge status={user.status} /></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {(user.userRoles ?? []).length > 0
                  ? (user.userRoles ?? []).map(ur => <RoleBadge key={ur.role.id} name={ur.role.name} />)
                  : <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No role</span>
                }
              </div>
              <div style={{ textAlign: 'right' }}>
                {canManageRoles && (
                  <button
                    onClick={() => setAssignTarget(user)}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Shield size={12} /> Role
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showInvite && <InviteModal roles={roles} onClose={() => setShowInvite(false)} />}
      {assignTarget && <RoleAssignModal user={assignTarget} roles={roles} onClose={() => setAssignTarget(null)} />}
    </div>
  );
}
