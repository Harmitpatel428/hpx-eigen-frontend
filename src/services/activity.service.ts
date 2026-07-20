import { api } from './api';
import type { Activity } from '../types';

export const activityService = {
  async findAll(filters?: { type?: string; opportunityId?: string }): Promise<Activity[]> {
    const params = new URLSearchParams();
    if (filters?.type && filters.type !== 'ALL') params.set('type', filters.type);
    if (filters?.opportunityId) params.set('opportunityId', filters.opportunityId);
    const { data } = await api.get<any>('/api/v1/activities', { params });
    return Array.isArray(data) ? data : (data?.data || []);
  },

  async create(input: {
    opportunityId: string; type: string; subject: string;
    notes?: string; scheduledAt?: string;
  }): Promise<Activity> {
    const { data } = await api.post<any>('/api/v1/activities', input);
    return data?.data || data;
  },

  async markComplete(id: string): Promise<Activity> {
    const { data } = await api.put<any>(`/api/v1/activities/${id}/complete`, {});
    return data?.data || data;
  },
};
