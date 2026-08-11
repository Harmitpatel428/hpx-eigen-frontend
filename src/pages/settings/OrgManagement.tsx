/**
 * OrgManagement — Enterprise Admin Console
 *
 * Provides 3 management tabs:
 *   1. Role Builder   — Permission matrix (modules × actions checkboxes)
 *   2. User Assignment — Assign roles with ABAC ScopeType selector
 *   3. Org Chart      — Department → Team hierarchy with user assignment
 *
 * Design: Strict Apple-style light theme.
 * bg-white, text-slate-900, border-slate-200, focus:ring-slate-900
 */
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Users,
  GitBranch,
  Plus,
  Trash2,
  ChevronRight,
  Check,
  X,
  UserPlus,
  Loader2,
  Building2,
  UsersRound,
  AlertCircle,
} from 'lucide-react';
import { permissionService } from '../../services/permission.service';
import { userService } from '../../services/user.service';
import type { Role, Department, Team, ScopeType, UserRoleAssignment } from '../../types';

// ─── Style tokens ─────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    background: '#ffffff',
    color: '#0f172a',
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: '32px',
    maxWidth: 1200,
    margin: '0 auto',
  } as React.CSSProperties,
  header: {
    marginBottom: 32,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 24,
  } as React.CSSProperties,
  tabs: {
    display: 'flex',
    gap: 4,
    background: '#f8fafc',
    padding: 4,
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    marginBottom: 32,
    width: 'fit-content',
  } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 18px',
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 150ms ease',
    background: active ? '#ffffff' : 'transparent',
    color: active ? '#0f172a' : '#64748b',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' : 'none',
  }),
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
  select: {
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    color: '#0f172a',
    outline: 'none',
    background: '#ffffff',
    cursor: 'pointer',
  } as React.CSSProperties,
  scopeBadge: (scope: string): React.CSSProperties => ({
    padding: '2px 8px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.02em',
    background:
      scope === 'ORGANIZATION' ? '#f0fdf4' :
      scope === 'DEPARTMENT'   ? '#fef9c3' :
      scope === 'TEAM'         ? '#eff6ff' : '#f8fafc',
    color:
      scope === 'ORGANIZATION' ? '#16a34a' :
      scope === 'DEPARTMENT'   ? '#a16207' :
      scope === 'TEAM'         ? '#2563eb' : '#64748b',
    border: `1px solid ${
      scope === 'ORGANIZATION' ? '#bbf7d0' :
      scope === 'DEPARTMENT'   ? '#fde68a' :
      scope === 'TEAM'         ? '#bfdbfe' : '#e2e8f0'
    }`,
  }),
};

import { RoleBuilder } from '../../components/auth/RoleBuilder';
import { PermissionMatrix } from '../../components/auth/PermissionMatrix';

const SCOPE_OPTIONS: ScopeType[] = ['OWN', 'TEAM', 'DEPARTMENT', 'ORGANIZATION'];

// ─── Tab 1: Role Builder ──────────────────────────────────────────────────────
function RoleBuilderTab() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
      <RoleBuilder selectedRoleId={selectedRoleId} onSelectRole={setSelectedRoleId} />
      <PermissionMatrix selectedRoleId={selectedRoleId} />
    </div>
  );
}

// ─── Tab 2: User Assignment ───────────────────────────────────────────────────
function UserAssignmentTab() {
  const qc = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignScope, setAssignScope] = useState<ScopeType>('OWN');
  const [filterDeptId, setFilterDeptId] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => permissionService.getRoles(),
  });

  const { data: allUsers = [], isLoading: allUsersLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => userService.listAll(),
    enabled: showAssignModal,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => permissionService.getDepartments(),
  });

  const { data: roleUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['role-users', selectedRoleId],
    queryFn: () => permissionService.getRoleUsers(selectedRoleId),
    enabled: !!selectedRoleId,
  });

  const assignedUserIds = useMemo(
    () => new Set(roleUsers.map((u: UserRoleAssignment) => u.id)),
    [roleUsers]
  );

  const filteredUsers = useMemo(() => {
    let list = allUsers.filter(u => !assignedUserIds.has(u.id) && u.status === 'ACTIVE');
    if (filterDeptId) list = list.filter(u => u.departmentId === filterDeptId);
    const q = userSearch.toLowerCase();
    if (q) list = list.filter(u =>
      u.email.toLowerCase().includes(q) ||
      [u.firstName, u.lastName].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
    return list;
  }, [allUsers, assignedUserIds, filterDeptId, userSearch]);

  const assignMutation = useMutation({
    mutationFn: () => permissionService.assignUserRole(selectedRoleId, assignUserId, assignScope),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role-users', selectedRoleId] });
      setShowAssignModal(false);
      setAssignUserId('');
      setAssignScope('OWN');
      setFilterDeptId('');
      setUserSearch('');
    },
  });

  const unassignMutation = useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      permissionService.unassignUserRole(roleId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['role-users', selectedRoleId] }),
  });

  const selectedUser = allUsers.find(u => u.id === assignUserId);

  function closeModal() {
    setShowAssignModal(false);
    setAssignUserId('');
    setAssignScope('OWN');
    setFilterDeptId('');
    setUserSearch('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Role selector + action bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <select
          style={{ ...S.select, minWidth: 200 }}
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
          aria-label="Select role"
        >
          <option value="">Select a role…</option>
          {roles.map((r: Role) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        {selectedRoleId && (
          <button style={S.btn('primary')} onClick={() => setShowAssignModal(true)}>
            <UserPlus size={14} /> Assign User
          </button>
        )}
      </div>

      {/* Assign modal */}
      {showAssignModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#ffffff', borderRadius: 16, padding: 28, width: 480,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0',
          }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#0f172a', marginBottom: 20 }}>
              Assign Role: {roles.find((r: Role) => r.id === selectedRoleId)?.name}
            </h2>

            {/* Department filter */}
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Filter by Department
            </label>
            <select
              style={{ ...S.select, width: '100%', marginBottom: 12 }}
              value={filterDeptId}
              onChange={(e) => { setFilterDeptId(e.target.value); setAssignUserId(''); }}
              aria-label="Filter users by department"
            >
              <option value="">All departments</option>
              {departments.map((d: Department) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* User search */}
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Select User
            </label>
            <input
              style={{ ...S.input, marginBottom: 6 }}
              placeholder="Search by name or email…"
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setAssignUserId(''); }}
              aria-label="Search users"
            />
            <select
              style={{ ...S.select, width: '100%', marginBottom: 4, height: 120 }}
              size={5}
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              aria-label="Select user to assign"
            >
              {allUsersLoading && <option disabled>Loading users…</option>}
              {!allUsersLoading && filteredUsers.length === 0 && (
                <option disabled>No eligible users found</option>
              )}
              {filteredUsers.map(u => {
                const displayName = [u.firstName, u.lastName].filter(Boolean).join(' ');
                return (
                  <option key={u.id} value={u.id}>
                    {displayName ? `${displayName} (${u.email})` : u.email}
                  </option>
                );
              })}
            </select>
            {selectedUser && (
              <p style={{ fontSize: 12, color: '#7C3AED', marginBottom: 12, fontWeight: 500 }}>
                Selected: {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || selectedUser.email}
              </p>
            )}
            {!selectedUser && <div style={{ marginBottom: 12 }} />}

            {/* Access scope */}
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Access Scope
            </label>
            <select
              style={{ ...S.select, width: '100%', marginBottom: 8 }}
              value={assignScope}
              onChange={(e) => setAssignScope(e.target.value as ScopeType)}
              aria-label="Select access scope"
            >
              {SCOPE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
              {assignScope === 'OWN'          && 'User sees only records they own.'}
              {assignScope === 'TEAM'         && 'User sees records owned by teammates.'}
              {assignScope === 'DEPARTMENT'   && 'User sees records owned by department members.'}
              {assignScope === 'ORGANIZATION' && 'User sees all records in the organization.'}
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={S.btn('ghost')} onClick={closeModal}>
                Cancel
              </button>
              <button
                style={S.btn('primary')}
                onClick={() => assignMutation.mutate()}
                disabled={!assignUserId || assignMutation.isPending}
              >
                {assignMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User list */}
      {selectedRoleId && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
              Assigned Users ({roleUsers.length})
            </span>
          </div>
          {usersLoading ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : roleUsers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              No users assigned to this role yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Email', 'Status', 'Team', 'Dept', 'Scope', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roleUsers.map((u: UserRoleAssignment) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#0f172a' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: u.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2',
                        color: u.status === 'ACTIVE' ? '#16a34a' : '#dc2626',
                      }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                      {u.teamId ? (u as any).teamName || u.teamId.slice(0, 8) + '…' : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                      {u.departmentId
                        ? departments.find((d: Department) => d.id === u.departmentId)?.name || u.departmentId.slice(0, 8) + '…'
                        : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={S.scopeBadge(u.scopeType)}>{u.scopeType}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        style={{ ...S.btn('danger'), padding: '5px 10px' }}
                        onClick={() => unassignMutation.mutate({ roleId: selectedRoleId, userId: u.id })}
                        aria-label={`Remove ${u.email} from role`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!selectedRoleId && (
        <div style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, minHeight: 250, color: '#94a3b8' }}>
          <Users size={32} style={{ opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>Select a role to manage user assignments</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Org Chart ─────────────────────────────────────────────────────────
function OrgChartTab() {
  const qc = useQueryClient();
  const [newDeptName, setNewDeptName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedDeptForTeam, setSelectedDeptForTeam] = useState<string>('');
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  const { data: departments = [], isLoading: deptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => permissionService.getDepartments(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => permissionService.getTeams(),
  });

  const createDeptMutation = useMutation({
    mutationFn: (name: string) => permissionService.createDepartment(name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setNewDeptName(''); },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => permissionService.deleteDepartment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });

  const createTeamMutation = useMutation({
    mutationFn: ({ name, departmentId }: { name: string; departmentId?: string }) =>
      permissionService.createTeam(name, departmentId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); setNewTeamName(''); setSelectedDeptForTeam(''); },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => permissionService.deleteTeam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });

  const getTeamsForDept = (deptId: string) =>
    teams.filter((t: Team) => t.departmentId === deptId);
  const unassignedTeams = teams.filter((t: Team) => !t.departmentId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
      {/* Hierarchy tree */}
      <div>
        {/* Departments */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={16} /> Departments
            </h3>
          </div>

          {deptsLoading ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {departments.map((dept: Department) => (
                <div key={dept.id} style={{ ...S.card }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Building2 size={15} style={{ color: '#64748b' }} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{dept.name}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {getTeamsForDept(dept.id).length} teams · {dept._count?.users ?? 0} members
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ChevronRight
                        size={15}
                        style={{
                          color: '#94a3b8',
                          transform: expandedDept === dept.id ? 'rotate(90deg)' : 'none',
                          transition: 'transform 150ms',
                        }}
                      />
                      <button
                        style={{ ...S.btn('danger'), padding: '4px 8px' }}
                        onClick={(e) => { e.stopPropagation(); deleteDeptMutation.mutate(dept.id); }}
                        aria-label={`Delete ${dept.name} department`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {expandedDept === dept.id && (
                    <div style={{ borderTop: '1px solid #f1f5f9', padding: '8px 16px 12px 36px' }}>
                      {getTeamsForDept(dept.id).map((team: Team) => (
                        <div key={team.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', borderRadius: 8, background: '#f8fafc',
                          marginBottom: 6, border: '1px solid #e2e8f0',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <UsersRound size={14} style={{ color: '#64748b' }} />
                            <span style={{ fontSize: 13, color: '#374151' }}>{team.name}</span>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{team._count?.users ?? 0} members</span>
                          </div>
                          <button
                            style={{ ...S.btn('danger'), padding: '3px 7px' }}
                            onClick={() => deleteTeamMutation.mutate(team.id)}
                            aria-label={`Delete ${team.name} team`}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                      {getTeamsForDept(dept.id).length === 0 && (
                        <p style={{ fontSize: 12, color: '#94a3b8', padding: '4px 0' }}>No teams in this department yet.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {departments.length === 0 && (
                <div style={{ ...S.card, padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                  <Building2 size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <p style={{ fontSize: 14 }}>No departments yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Unassigned teams */}
          {unassignedTeams.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <UsersRound size={14} /> Teams without department
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {unassignedTeams.map((team: Team) => (
                  <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fafafa' }}>
                    <span style={{ fontSize: 13, color: '#374151' }}>{team.name}</span>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                      onClick={() => deleteTeamMutation.mutate(team.id)}
                      aria-label={`Delete ${team.name}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Create Department */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> New Department
            </span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              style={S.input}
              placeholder="Department name…"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              aria-label="New department name"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newDeptName.trim()) {
                  createDeptMutation.mutate(newDeptName.trim());
                }
              }}
            />
            <button
              style={{ ...S.btn('primary'), justifyContent: 'center' }}
              onClick={() => newDeptName.trim() && createDeptMutation.mutate(newDeptName.trim())}
              disabled={!newDeptName.trim() || createDeptMutation.isPending}
            >
              {createDeptMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
              Create Department
            </button>
          </div>
        </div>

        {/* Create Team */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> New Team
            </span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              style={S.input}
              placeholder="Team name…"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              aria-label="New team name"
            />
            <select
              style={{ ...S.select, width: '100%' }}
              value={selectedDeptForTeam}
              onChange={(e) => setSelectedDeptForTeam(e.target.value)}
              aria-label="Select department for team"
            >
              <option value="">No department</option>
              {departments.map((d: Department) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button
              style={{ ...S.btn('primary'), justifyContent: 'center' }}
              onClick={() => newTeamName.trim() && createTeamMutation.mutate({
                name: newTeamName.trim(),
                departmentId: selectedDeptForTeam || undefined,
              })}
              disabled={!newTeamName.trim() || createTeamMutation.isPending}
            >
              {createTeamMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
              Create Team
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ ...S.card, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Scope Legend</p>
          {SCOPE_OPTIONS.map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={S.scopeBadge(s)}>{s}</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {s === 'OWN'          && 'Own records only'}
                {s === 'TEAM'         && 'All team member records'}
                {s === 'DEPARTMENT'   && 'All department member records'}
                {s === 'ORGANIZATION' && 'All tenant records'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────
export function OrgManagement() {
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'org'>('roles');

  const tabs = [
    { id: 'roles' as const, label: 'Role Builder',     icon: Shield },
    { id: 'users' as const, label: 'User Assignment',  icon: Users },
    { id: 'org'   as const, label: 'Org Chart',        icon: GitBranch },
  ];

  return (
    <div style={S.page}>
      <header style={S.header}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Authorization Console
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          Manage roles, permissions, user assignments, and organizational hierarchy.
        </p>
      </header>

      {/* Tab navigation */}
      <nav style={S.tabs} role="tablist" aria-label="Authorization console tabs">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            style={S.tab(activeTab === id)}
            onClick={() => setActiveTab(id)}
            role="tab"
            aria-selected={activeTab === id}
            id={`tab-${id}`}
            aria-controls={`panel-${id}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      {/* Tab panels */}
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'roles' && <RoleBuilderTab />}
        {activeTab === 'users' && <UserAssignmentTab />}
        {activeTab === 'org'   && <OrgChartTab />}
      </div>
    </div>
  );
}
