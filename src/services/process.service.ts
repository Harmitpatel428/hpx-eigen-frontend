import { api } from './api';
import type { DocCase, ProcessReturnReason } from '../types';

function unwrap<T>(res: { data: { data?: T; success?: boolean } & T }): T {
  const d = res.data;
  return ('data' in d && d.data !== undefined) ? (d.data as T) : (d as unknown as T);
}

export interface ProcessCounts {
  incoming: number;
  processing: number;
  returned: number;
  overdue: number;
}

export interface ProcessQueue {
  cases: DocCase[];
  // `overdue` added alongside the original three so the queue response and the
  // /dashboard counts share one shape (same frozen contract).
  counts: ProcessCounts;
}

export interface ProcessCaseParams {
  // Semantic bucket matching the counts keys (incoming | processing | returned | overdue),
  // NOT a DocCaseStatus enum value. Shared vocabulary with the backend contract.
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// React Query keys — one place so the page and its mutations can't drift.
export const processKeys = {
  cases: (params: ProcessCaseParams = {}) => ['process-cases', params] as const,
  case: (id: string) => ['process-case', id] as const,
  dashboard: () => ['process-dashboard'] as const,
};

export const processService = {
  // Carries the header counts alongside the list so the Process queue (process:view)
  // needs no doc:view-gated dashboard call.
  async listIncoming(): Promise<ProcessQueue> {
    return unwrap(await api.get('/api/v1/process/cases'));
  },

  async listCases(params: ProcessCaseParams = {}): Promise<ProcessQueue> {
    return unwrap(await api.get('/api/v1/process/cases', { params }));
  },

  async getCase(caseId: string): Promise<DocCase> {
    return unwrap(await api.get(`/api/v1/process/cases/${caseId}`));
  },

  async getDashboard(): Promise<ProcessCounts> {
    return unwrap(await api.get('/api/v1/process/dashboard'));
  },

  async accept(caseId: string): Promise<DocCase> {
    return unwrap(await api.post(`/api/v1/process/cases/${caseId}/accept`));
  },

  async assignCase(caseId: string, assigneeUserId: string): Promise<DocCase> {
    return unwrap(await api.post(`/api/v1/process/cases/${caseId}/assign`, { assigneeUserId }));
  },

  async returnToDocumentation(caseId: string, reasonCode: ProcessReturnReason, note: string): Promise<DocCase> {
    return unwrap(await api.post(`/api/v1/process/cases/${caseId}/return`, { reasonCode, note }));
  },
};
