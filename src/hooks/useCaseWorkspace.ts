import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { caseWorkspaceService } from '../services/case-workspace.service';
import { extractApiError } from '../utils/extractApiError';
import type { PatchValueEntry } from '../types/caseConfig';

export const useCaseFieldValues = (caseId: string, enabled = true) =>
  useQuery({
    queryKey: ['case-field-values', caseId],
    queryFn: () => caseWorkspaceService.getFieldValues(caseId),
    enabled: enabled && !!caseId,
  });

export const useCaseTimeline = (caseId: string, enabled = true) =>
  useQuery({
    queryKey: ['case-timeline', caseId],
    queryFn: () => caseWorkspaceService.getTimeline(caseId),
    enabled: enabled && !!caseId,
  });

export const useCaseForecast = (caseId: string, enabled = true) =>
  useQuery({
    queryKey: ['case-forecast', caseId],
    queryFn: () => caseWorkspaceService.getForecast(caseId),
    enabled: enabled && !!caseId,
  });

function useEngineMutation<V>(caseId: string, fn: (v: V) => Promise<unknown>, keys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      keys.forEach((k) => qc.invalidateQueries({ queryKey: [k, caseId] }));
    },
    onError: (err) => toast.error(extractApiError(err).message),
  });
}

const STAGE_KEYS = ['case-timeline', 'case-forecast', 'doc-case'];

export const usePatchFieldValues = (caseId: string) =>
  useEngineMutation(caseId, (values: PatchValueEntry[]) => caseWorkspaceService.patchFieldValues(caseId, values), ['case-field-values']);

export const useStartStage = (caseId: string) =>
  useEngineMutation(caseId, (stageId: string) => caseWorkspaceService.startStage(caseId, stageId), STAGE_KEYS);

export const useCompleteStage = (caseId: string) =>
  useEngineMutation(
    caseId,
    (v: { stageId: string; override?: boolean; reason?: string }) =>
      caseWorkspaceService.completeStage(caseId, v.stageId, { override: v.override, reason: v.reason }),
    STAGE_KEYS,
  );

export const useUnlockStage = (caseId: string) =>
  useEngineMutation(
    caseId,
    (v: { stageId: string; reason: string }) => caseWorkspaceService.unlockStage(caseId, v.stageId, v.reason),
    STAGE_KEYS,
  );

export const useAssignCaseType = (caseId: string) =>
  useEngineMutation(caseId, (caseTypeId: string) => caseWorkspaceService.assignCaseType(caseId, caseTypeId), ['doc-case']);
