import { api } from './api';
import { LeadActivity } from '../types';

export interface LeadActivitiesPage {
  data: LeadActivity[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listLeadActivities(
  leadId: string,
  page = 1,
  pageSize = 50
): Promise<LeadActivitiesPage> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const res = await api.get(`/leads/${leadId}/activities?${params}`);
  return res.data;
}
