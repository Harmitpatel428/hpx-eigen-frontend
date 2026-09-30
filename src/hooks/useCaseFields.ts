import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { caseConfigService } from '../services/case-config.service';
import { crmSettingsService } from '../services/crm-settings.service';
import { extractApiError } from '../utils/extractApiError';
import type {
  CaseFieldOptionPayload,
  CreateCaseFieldPayload,
  UpdateCaseFieldPayload,
} from '../types/caseConfig';

const KEY = ['case-fields'];

export function useCaseFields(includeArchived = false) {
  return useQuery({
    queryKey: ['case-fields', { includeArchived }],
    queryFn: () => caseConfigService.listFields(includeArchived),
  });
}

export function useCaseFieldOptions(fieldId: string | null) {
  return useQuery({
    queryKey: ['case-fields', fieldId, 'options'],
    queryFn: () => caseConfigService.listOptions(fieldId as string),
    enabled: !!fieldId,
  });
}

function useCaseMutation<V>(fn: (v: V) => Promise<unknown>, successMsg: string) {
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

export const useCreateField = () =>
  useCaseMutation((p: CreateCaseFieldPayload) => caseConfigService.createField(p), 'Field created');
export const useUpdateField = () =>
  useCaseMutation((v: { id: string; payload: UpdateCaseFieldPayload }) => caseConfigService.updateField(v.id, v.payload), 'Field updated');
export const useActivateField = () =>
  useCaseMutation((id: string) => caseConfigService.activateField(id), 'Field activated');
export const useSetFieldReadOnly = () =>
  useCaseMutation((id: string) => caseConfigService.setFieldReadOnly(id), 'Field set to read-only');
export const useArchiveField = () =>
  useCaseMutation((id: string) => caseConfigService.archiveField(id), 'Field archived');
export const useCreateOption = () =>
  useCaseMutation((v: { fieldId: string; payload: CaseFieldOptionPayload }) => caseConfigService.createOption(v.fieldId, v.payload), 'Option added');
export const useUpdateOption = () =>
  useCaseMutation(
    (v: { fieldId: string; optionId: string; payload: Partial<CaseFieldOptionPayload> }) =>
      caseConfigService.updateOption(v.fieldId, v.optionId, v.payload),
    'Option updated',
  );
export const useArchiveOption = () =>
  useCaseMutation((v: { fieldId: string; optionId: string }) => caseConfigService.archiveOption(v.fieldId, v.optionId), 'Option archived');

export function useCaseEngineSettings() {
  return useQuery({
    queryKey: ['crm-settings'],
    queryFn: () => crmSettingsService.get(),
    staleTime: Infinity,
  });
}

export function useSetCaseEngineEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => crmSettingsService.setCaseEngineEnabled(enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-settings'] });
      toast.success('Case engine setting updated');
    },
    onError: (err) => toast.error(extractApiError(err).message),
  });
}
