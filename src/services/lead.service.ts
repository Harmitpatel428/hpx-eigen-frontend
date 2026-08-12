import { api } from './api';
import type { Lead, LeadSource, LeadStage, LeadPriority, CustomFieldValue } from '../types';

export interface CreateLeadPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: LeadSource;
  notes?: string;
  score?: number;
  stage?: LeadStage;
  expectedValue?: number | string;
  priority?: LeadPriority;
  expectedCloseDate?: string;
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  postalCode?: string;
  freeformAddress?: string;
  ownerId?: string;
  tagNames?: string[];
  customFieldValues?: Pick<CustomFieldValue, 'fieldId' | 'value'>[];
}

export interface UpdateLeadPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: LeadSource;
  notes?: string;
  score?: number;
  stage?: LeadStage;
  expectedValue?: number | string;
  priority?: LeadPriority;
  expectedCloseDate?: string | null;
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  postalCode?: string;
  freeformAddress?: string | null;
  ownerId?: string | null;
  tagNames?: string[];
  customFieldValues?: Pick<CustomFieldValue, 'fieldId' | 'value'>[];
}

export interface ImportLeadPayload {
  rows: CreateLeadPayload[];
  onDuplicates: 'skip' | 'overwrite';
}

export interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DuplicateLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  stage: string;
  status: string;
  ownerId: string | null;
  createdAt: string;
}

export const leadService = {
  async findAll(filters?: {
    status?: string;
    source?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<LeadsResponse> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);
    if (filters?.source && filters.source !== 'ALL') params.set('source', filters.source);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));

    const { data } = await api.get<any>('/api/v1/leads', { params });
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data as LeadsResponse;
    }
    const arr = Array.isArray(data) ? data : [];
    return { data: arr, total: arr.length, page: 1, pageSize: arr.length };
  },

  async create(input: CreateLeadPayload): Promise<Lead> {
    const { data } = await api.post<any>('/api/v1/leads', input);
    return data?.data || data;
  },

  async update(id: string, input: UpdateLeadPayload): Promise<Lead> {
    const { data } = await api.put<any>(`/api/v1/leads/${id}`, input);
    return data?.data || data;
  },

  async softDelete(id: string): Promise<void> {
    await api.delete(`/api/v1/leads/${id}`);
  },

  async importBatch(
    rows: CreateLeadPayload[],
    onProgress?: (done: number, total: number) => void,
  ): Promise<{ imported: number; skipped: number; errors: { row: number; message: string }[] }> {
    const { data } = await api.post<any>('/api/v1/leads/import', { rows, onDuplicates: 'skip' });
    const result = data?.data ?? data;
    onProgress?.(rows.length, rows.length);
    return {
      imported: result.imported ?? 0,
      skipped: result.skipped ?? 0,
      errors: result.errors ?? [],
    };
  },

  async bulkDelete(ids: string[]): Promise<{ count: number }> {
    const { data } = await api.post<any>('/api/v1/leads/bulk-delete', { ids });
    return data?.data || data;
  },

  async listDeleted(page = 1, pageSize = 50): Promise<LeadsResponse> {
    const { data } = await api.get<any>('/api/v1/leads/deleted', { params: { page, pageSize } });
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data as LeadsResponse;
    }
    const arr = Array.isArray(data) ? data : [];
    return { data: arr, total: arr.length, page: 1, pageSize: arr.length };
  },

  async restoreLead(id: string): Promise<void> {
    await api.post(`/api/v1/leads/${id}/restore`);
  },

  async bulkRestore(ids: string[]): Promise<{ count: number }> {
    const { data } = await api.post<any>('/api/v1/leads/bulk-restore', { ids });
    return data?.data || data;
  },

  async permanentDelete(id: string): Promise<void> {
    await api.delete(`/api/v1/leads/${id}/permanent`);
  },

  async bulkPermanentDelete(ids: string[]): Promise<{ count: number }> {
    const { data } = await api.post<any>('/api/v1/leads/bulk-permanent-delete', { ids });
    return data?.data || data;
  },

  async previewAutoAssign(payload: { leadIds: string[]; departmentId: string }): Promise<{
    employees: Array<{ id: string; firstName: string | null; lastName: string | null; currentWorkload: number; delta: number }>;
    totalLeads: number;
  }> {
    const { data } = await api.post<any>('/api/v1/leads/bulk-assign/preview', payload);
    return data?.data ?? data;
  },

  async bulkAssign(payload: {
    leadIds: string[];
    mode: 'MANUAL' | 'AUTO';
    userId?: string;
    departmentId?: string;
  }): Promise<{ count: number }> {
    const { data } = await api.post<any>('/api/v1/leads/bulk-assign', payload);
    return data?.data ?? data;
  },

  async checkDuplicates(params: {
    email?: string;
    phone?: string;
    company?: string;
    firstName?: string;
    lastName?: string;
    excludeId?: string;
  }): Promise<DuplicateLead[]> {
    const query = new URLSearchParams();
    if (params.email) query.set('email', params.email);
    if (params.phone) query.set('phone', params.phone);
    if (params.company) query.set('company', params.company);
    if (params.firstName) query.set('firstName', params.firstName);
    if (params.lastName) query.set('lastName', params.lastName);
    if (params.excludeId) query.set('excludeId', params.excludeId);

    const { data } = await api.get<any>(`/api/v1/leads/check-duplicates?${query}`);
    return data?.data ?? [];
  },
};
