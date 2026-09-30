import { api } from './api';
import type {
  CaseTimelineResponse,
  FieldValuesResponse,
  ForecastResponse,
  PatchValueEntry,
} from '../types/caseConfig';

async function unwrap<T>(promise: Promise<{ data: unknown }>): Promise<T> {
  const { data } = await promise;
  return ((data as { data?: T })?.data ?? data) as T;
}

const caseBase = (caseId: string) => `/api/v1/cases/${caseId}`;

// Errors intentionally propagate so react-query can surface 403/409/500.
export const caseWorkspaceService = {
  getFieldValues(caseId: string): Promise<FieldValuesResponse> {
    return unwrap(api.get(`${caseBase(caseId)}/field-values`));
  },
  patchFieldValues(caseId: string, values: PatchValueEntry[]): Promise<unknown> {
    return unwrap(api.patch(`${caseBase(caseId)}/field-values`, { values }));
  },
  validateFieldValues(caseId: string): Promise<{ valid: boolean; missing: unknown[] }> {
    return unwrap(api.post(`${caseBase(caseId)}/field-values/validate`));
  },
  getTimeline(caseId: string): Promise<CaseTimelineResponse> {
    return unwrap(api.get(`${caseBase(caseId)}/timeline`));
  },
  getForecast(caseId: string): Promise<ForecastResponse> {
    return unwrap(api.get(`${caseBase(caseId)}/timeline/forecast`));
  },
  startStage(caseId: string, stageId: string): Promise<unknown> {
    return unwrap(api.post(`${caseBase(caseId)}/stages/${stageId}/start`));
  },
  completeStage(caseId: string, stageId: string, opts?: { override?: boolean; reason?: string }): Promise<unknown> {
    return unwrap(api.post(`${caseBase(caseId)}/stages/${stageId}/complete`, opts ?? {}));
  },
  unlockStage(caseId: string, stageId: string, reason: string): Promise<unknown> {
    return unwrap(api.post(`${caseBase(caseId)}/stages/${stageId}/unlock`, { reason }));
  },
  assignCaseType(caseId: string, caseTypeId: string): Promise<unknown> {
    return unwrap(api.patch(`${caseBase(caseId)}/case-type`, { caseTypeId }));
  },
};
