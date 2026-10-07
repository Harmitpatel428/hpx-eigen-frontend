import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { caseWorkspaceService, type AssignPoliciesPayload } from '../services/case-workspace.service';
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

export const useSetTarget = (caseId: string) =>
  useEngineMutation(caseId, (targetDate: string | null) => caseWorkspaceService.setTarget(caseId, targetDate), STAGE_KEYS);

export const useApproveException = (caseId: string) =>
  useEngineMutation(caseId, (reason: string) => caseWorkspaceService.approveException(caseId, reason), STAGE_KEYS);

export const usePauseStage = (caseId: string) =>
  useEngineMutation(caseId, (v: { stageId: string }) => caseWorkspaceService.pauseStage(caseId, v.stageId), STAGE_KEYS);

export const useResumeStage = (caseId: string) =>
  useEngineMutation(caseId, (v: { stageId: string }) => caseWorkspaceService.resumeStage(caseId, v.stageId), STAGE_KEYS);

export const useReopenStage = (caseId: string) =>
  useEngineMutation(caseId, (v: { stageId: string }) => caseWorkspaceService.reopenStage(caseId, v.stageId), STAGE_KEYS);

export const useSkipStage = (caseId: string) =>
  useEngineMutation(
    caseId,
    (v: { stageId: string; reason: string }) => caseWorkspaceService.skipStage(caseId, v.stageId, v.reason),
    STAGE_KEYS,
  );

export const useOverrideDuration = (caseId: string) =>
  useEngineMutation(
    caseId,
    (v: { stageId: string; remainingDuration: number; reason: string }) =>
      caseWorkspaceService.overrideDuration(caseId, v.stageId, v.remainingDuration, v.reason),
    STAGE_KEYS,
  );

export const useCreateTimeline = (caseId: string) =>
  useEngineMutation(caseId, (_: void) => caseWorkspaceService.createTimeline(caseId), STAGE_KEYS);

export const useAssignCaseType = (caseId: string) =>
  useEngineMutation(caseId, (caseTypeId: string) => caseWorkspaceService.assignCaseType(caseId, caseTypeId), ['doc-case']);

// Multi-policy save. Invalidates exactly the four case/list/handoff/dashboard keys.
// No onError toast: the policy dialog surfaces 400/409/422 messages inline and stays open.
export const useAssignPolicies = (caseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignPoliciesPayload) => caseWorkspaceService.assignPolicies(caseId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc-case', caseId] });
      qc.invalidateQueries({ queryKey: ['doc-cases'] });
      qc.invalidateQueries({ queryKey: ['incoming-handoffs'] });
      qc.invalidateQueries({ queryKey: ['doc-dashboard'] });
    },
  });
};

export const useCaseTypeComponents = (caseTypeId: string | undefined, includeInactive = false, enabled = true) =>
  useQuery({
    queryKey: ['case-types', caseTypeId, 'components', { includeInactive }],
    queryFn: () => caseWorkspaceService.listCaseTypeComponents(caseTypeId as string, includeInactive),
    enabled: enabled && !!caseTypeId,
  });
