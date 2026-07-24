/**
 * Permission API service — Admin Console operations.
 * All endpoints are tenant-derived from the JWT (no tenantId in URLs).
 */
import { api } from './api';
import type { Role, Permission, Department, Team, ScopeType, UserRoleAssignment } from '../types';

// ─── Roles ────────────────────────────────────────────────────────

export const permissionService = {
  /** List all roles in the tenant */
  async getRoles(): Promise<Role[]> {
    const { data } = await api.get<Role[]>('/api/v1/roles');
    return data;
  },

  /** Create a new role */
  async createRole(name: string): Promise<Role> {
    const { data } = await api.post<Role>('/api/v1/roles', { name });
    return data;
  },

  // ─── Role Permissions ──────────────────────────────────────────

  /** List all global permissions (for matrix builder) */
  async getAllPermissions(): Promise<Permission[]> {
    const { data } = await api.get<Permission[]>('/api/v1/roles/permissions/all');
    return data;
  },

  /** List permissions assigned to a specific role */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const { data } = await api.get<Permission[]>(`/api/v1/roles/${roleId}/permissions`);
    return data;
  },

  /** Add a permission to a role */
  async addRolePermission(roleId: string, permissionId: string): Promise<void> {
    await api.post(`/api/v1/roles/${roleId}/permissions`, { permissionId });
  },

  /** Remove a permission from a role */
  async removeRolePermission(roleId: string, permissionId: string): Promise<void> {
    await api.delete(`/api/v1/roles/${roleId}/permissions/${permissionId}`);
  },

  // ─── User Role Assignments ─────────────────────────────────────

  /** List users assigned to a role with their scope */
  async getRoleUsers(roleId: string): Promise<UserRoleAssignment[]> {
    const { data } = await api.get<UserRoleAssignment[]>(`/api/v1/roles/${roleId}/users`);
    return data;
  },

  /** Assign a role to a user with an ABAC scope */
  async assignUserRole(roleId: string, userId: string, scopeType: ScopeType): Promise<void> {
    await api.post(`/api/v1/roles/${roleId}/users`, { userId, scopeType });
  },

  /** Remove a role assignment from a user */
  async unassignUserRole(roleId: string, userId: string): Promise<void> {
    await api.delete(`/api/v1/roles/${roleId}/users/${userId}`);
  },

  // ─── Departments ───────────────────────────────────────────────

  /** List all departments in the tenant */
  async getDepartments(): Promise<Department[]> {
    const { data } = await api.get<Department[]>('/api/v1/departments');
    return data;
  },

  /** Create a new department */
  async createDepartment(name: string, parentId?: string): Promise<Department> {
    const { data } = await api.post<Department>('/api/v1/departments', { name, parentId });
    return data;
  },

  /** Update a department */
  async updateDepartment(id: string, updates: { name?: string; parentId?: string | null }): Promise<Department> {
    const { data } = await api.put<Department>(`/api/v1/departments/${id}`, updates);
    return data;
  },

  /** Delete a department */
  async deleteDepartment(id: string): Promise<void> {
    await api.delete(`/api/v1/departments/${id}`);
  },

  // ─── Teams ─────────────────────────────────────────────────────

  /** List all teams in the tenant */
  async getTeams(): Promise<Team[]> {
    const { data } = await api.get<Team[]>('/api/v1/teams');
    return data;
  },

  /** Create a new team */
  async createTeam(name: string, departmentId?: string): Promise<Team> {
    const { data } = await api.post<Team>('/api/v1/teams', { name, departmentId });
    return data;
  },

  /** Update a team */
  async updateTeam(id: string, updates: { name?: string; departmentId?: string | null }): Promise<Team> {
    const { data } = await api.put<Team>(`/api/v1/teams/${id}`, updates);
    return data;
  },

  /** Delete a team */
  async deleteTeam(id: string): Promise<void> {
    await api.delete(`/api/v1/teams/${id}`);
  },

  /** Assign a user to a team */
  async assignUserToTeam(teamId: string, userId: string): Promise<void> {
    await api.post(`/api/v1/teams/${teamId}/members`, { userId });
  },

  /** Remove a user from a team */
  async removeUserFromTeam(teamId: string, userId: string): Promise<void> {
    await api.delete(`/api/v1/teams/${teamId}/members/${userId}`);
  },
};
