import { api } from './api';
import type { DocCase, ProcessReturnReason } from '../types';

function unwrap<T>(res: { data: { data?: T; success?: boolean } & T }): T {
  const d = res.data;
  return ('data' in d && d.data !== undefined) ? (d.data as T) : (d as unknown as T);
}

export interface ProcessQueue {
  cases: DocCase[];
  counts: { incoming: number; processing: number; returned: number };
}

export const processService = {
  // Carries the header counts alongside the list so the Process queue (process:view)
  // needs no doc:view-gated dashboard call.
  async listIncoming(): Promise<ProcessQueue> {
    return unwrap(await api.get('/api/v1/process/cases'));
  },

  async accept(caseId: string): Promise<DocCase> {
    return unwrap(await api.post(`/api/v1/process/cases/${caseId}/accept`));
  },

  async returnToDocumentation(caseId: string, reasonCode: ProcessReturnReason, note: string): Promise<DocCase> {
    return unwrap(await api.post(`/api/v1/process/cases/${caseId}/return`, { reasonCode, note }));
  },
};
