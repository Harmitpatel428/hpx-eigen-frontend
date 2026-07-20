import { api } from './api';
import type { Opportunity } from '../types';

export const opportunityService = {
  async findAll(filters?: { stage?: string; ownerId?: string }): Promise<Opportunity[]> {
    const params = new URLSearchParams();
    if (filters?.stage && filters.stage !== 'ALL') params.set('stage', filters.stage);
    if (filters?.ownerId) params.set('ownerId', filters.ownerId);
    const { data } = await api.get<any>('/api/v1/opportunities', { params });
    return Array.isArray(data) ? data : (data?.data || []);
  },

  async create(input: {
    leadId: string; title: string; value: string;
    currency?: string; ownerId: string; expectedCloseDate?: string;
  }): Promise<Opportunity> {
    const { data } = await api.post<Opportunity>('/api/v1/opportunities', input);
    return data;
  },

  async advanceStage(id: string, stage: string, lostReason?: string): Promise<Opportunity> {
    const { data } = await api.put<Opportunity>(`/api/v1/opportunities/${id}/stage`, { stage, lostReason });
    return data;
  },
};
