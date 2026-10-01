import { useQuery } from '@tanstack/react-query';
import { caseReportsService } from '../services/case-reports.service';
import { documentationService, type ListCasesParams } from '../services/documentation.service';

export const useOverdueByStage = (enabled = true) =>
  useQuery({ queryKey: ['case-reports', 'overdue-by-stage'], queryFn: caseReportsService.getOverdueByStage, enabled });

export const useOnTimeVsLate = (enabled = true) =>
  useQuery({ queryKey: ['case-reports', 'on-time-vs-late'], queryFn: caseReportsService.getOnTimeVsLate, enabled });

export const useCasesByOption = (fieldId: string | null) =>
  useQuery({
    queryKey: ['case-reports', 'cases-by-option', fieldId],
    queryFn: () => caseReportsService.getCasesByOption(fieldId as string),
    enabled: !!fieldId,
  });

export const useCaseList = (params: ListCasesParams) =>
  useQuery({ queryKey: ['case-list', params], queryFn: () => documentationService.listCases(params) });
