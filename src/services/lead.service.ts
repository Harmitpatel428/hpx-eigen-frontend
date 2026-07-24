import { api } from './api';
import type { Lead, LeadSource, LeadStage } from '../types';

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
}

export interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
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
    // Backend returns { data: Lead[], total, page, pageSize }
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data as LeadsResponse;
    }
    // Fallback for bare array
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
};
