import { api } from './api';
import type { DocCase, HandoffReturnReason } from '../types';

function unwrap<T>(res: { data: { data?: T; success?: boolean } & T }): T {
  const d = res.data;
  return ('data' in d && d.data !== undefined) ? (d.data as T) : (d as unknown as T);
}

export const handoffService = {
  async confirmHandoff(leadId: string, presetId?: string): Promise<DocCase> {
    return unwrap(await api.post(`/api/v1/leads/${leadId}/handoff/confirm`, { presetId }));
  },

  async getIncoming(): Promise<DocCase[]> {
    return unwrap(await api.get('/api/v1/cases/incoming'));
  },

  async searchByCaseNumber(caseNumber: string): Promise<DocCase[]> {
    return unwrap(await api.get('/api/v1/cases/search', { params: { caseNumber } }));
  },

  async accept(caseId: string): Promise<DocCase> {
    return unwrap(await api.post(`/api/v1/cases/${caseId}/handoff/accept`));
  },

  async reject(caseId: string, reasonCode: HandoffReturnReason, note: string): Promise<DocCase> {
    return unwrap(await api.post(`/api/v1/cases/${caseId}/handoff/reject`, { reasonCode, note }));
  },

  async returnCase(caseId: string, reasonCode: HandoffReturnReason, note: string): Promise<DocCase> {
    return unwrap(await api.post(`/api/v1/cases/${caseId}/return`, { reasonCode, note }));
  },

  async resend(caseId: string, resolutionNote: string): Promise<DocCase> {
    return unwrap(await api.post(`/api/v1/cases/${caseId}/handoff/resend`, { resolutionNote }));
  },

  async clearManagerReview(caseId: string, note: string): Promise<DocCase> {
    return unwrap(await api.post(`/api/v1/cases/${caseId}/handoff/manager-review`, { note }));
  },
};
