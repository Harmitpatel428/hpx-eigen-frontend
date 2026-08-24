import { api } from './api';

export type GlobalFilter = 'DUE_TODAY' | 'UPCOMING' | 'OVERDUE' | 'MINE';

export interface LeadActivityItem {
  id: string;
  tenantId: string;
  leadId: string;
  actorUserId: string | null;
  type: string;
  state: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  subject: string;
  metadata: Record<string, unknown>;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lead: { id: string; firstName: string; lastName: string; stage: string; company: string | null } | null;
  actor: { id: string; firstName: string; lastName: string } | null;
}

export interface LeadActivityPage {
  data: LeadActivityItem[];
  total: number;
  page: number;
  pageSize: number;
}

export const leadActivityService = {
  async findAll(filter: GlobalFilter = 'DUE_TODAY', page = 1, pageSize = 50): Promise<LeadActivityPage> {
    const params = new URLSearchParams({ filter, page: String(page), pageSize: String(pageSize) });
    const { data } = await api.get<LeadActivityPage>(`/api/v1/lead-activities?${params}`);
    return data;
  },

  async create(input: {
    leadId: string;
    type: string;
    subject: string;
    scheduledAt?: string;
    metadata?: Record<string, unknown>;
  }): Promise<LeadActivityItem> {
    const { data } = await api.post<{ data: LeadActivityItem }>('/api/v1/lead-activities', input);
    return data.data;
  },

  async markComplete(id: string, opts?: { note?: string; nextFollowUp?: string }): Promise<LeadActivityItem> {
    const { data } = await api.patch<{ data: LeadActivityItem }>(`/api/v1/lead-activities/${id}/complete`, opts ?? {});
    return data.data;
  },

  async bulkComplete(ids: string[]): Promise<{ count: number }> {
    const { data } = await api.post<{ count: number }>('/api/v1/lead-activities/bulk-complete', { ids });
    return data;
  },
};
