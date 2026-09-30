import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { caseConfigService } from '../services/case-config.service';
import { extractApiError } from '../utils/extractApiError';
import type { CreateRulePayload, UpdateRulePayload } from '../types/caseConfig';

const KEY = ['case-field-rules'];

export function useCaseFieldRules(includeArchived = false) {
  return useQuery({
    queryKey: ['case-field-rules', { includeArchived }],
    queryFn: () => caseConfigService.listRules(includeArchived),
  });
}

// onError toasts but does not swallow: mutateAsync callers still receive the rejection (e.g. 422 cycle).
function useRuleMutation<V>(fn: (v: V) => Promise<unknown>, successMsg: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(successMsg);
    },
    onError: (err) => toast.error(extractApiError(err).message),
  });
}

export const useCreateRule = () =>
  useRuleMutation((p: CreateRulePayload) => caseConfigService.createRule(p), 'Rule created');
export const useUpdateRule = () =>
  useRuleMutation((v: { id: string; payload: UpdateRulePayload }) => caseConfigService.updateRule(v.id, v.payload), 'Rule updated');
export const useArchiveRule = () =>
  useRuleMutation((id: string) => caseConfigService.archiveRule(id), 'Rule archived');
