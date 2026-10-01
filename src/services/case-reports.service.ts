import { api } from './api';

async function unwrap<T>(promise: Promise<{ data: unknown }>): Promise<T> {
  const { data } = await promise;
  return ((data as { data?: T })?.data ?? data) as T;
}

export interface OverdueByStageRow { stageKey: string; overdue: number; atRisk: number }
export interface OnTimeVsLate { onTime: number; late: number }
export interface CasesByOptionRow { optionId: string; label: string; count: number }

const base = '/api/v1/documentation/reports';

export const caseReportsService = {
  getOverdueByStage: () => unwrap<OverdueByStageRow[]>(api.get(`${base}/overdue-by-stage`)),
  getOnTimeVsLate: () => unwrap<OnTimeVsLate>(api.get(`${base}/on-time-vs-late`)),
  getCasesByOption: (fieldId: string) =>
    unwrap<CasesByOptionRow[]>(api.get(`${base}/cases-by-option`, { params: { fieldId } })),
};
