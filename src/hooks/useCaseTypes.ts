import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { caseConfigService } from '../services/case-config.service';
import { extractApiError } from '../utils/extractApiError';
import type { CreateCaseTypePayload, CreateStageTemplatePayload, PlacementPayload, UpdateStageTemplatePayload, UpdateCaseTypePayload } from '../types/caseConfig';

const KEY = ['case-types'];

export function useCaseTypes(includeArchived = false) {
  return useQuery({
    queryKey: ['case-types', { includeArchived }],
    queryFn: () => caseConfigService.listCaseTypes(includeArchived),
  });
}

export function usePlacements(caseTypeId: string | null) {
  return useQuery({
    queryKey: ['case-types', caseTypeId, 'placements'],
    queryFn: () => caseConfigService.listPlacements(caseTypeId as string),
    enabled: !!caseTypeId,
  });
}

export function useStageTemplates(caseTypeId: string | null) {
  return useQuery({
    queryKey: ['case-types', caseTypeId, 'stages'],
    queryFn: () => caseConfigService.listStageTemplates(caseTypeId as string),
    enabled: !!caseTypeId,
  });
}

function useCaseTypeMutation<V>(
  fn: (v: V) => Promise<unknown>,
  successMsg: string,
  keyFor: (v: V) => unknown[] = () => KEY,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: keyFor(v) });
      toast.success(successMsg);
    },
    onError: (err) => toast.error(extractApiError(err).message),
  });
}

const placementsKey = (v: { caseTypeId: string }) => ['case-types', v.caseTypeId, 'placements'];

export const useCreateCaseType = () =>
  useCaseTypeMutation((p: CreateCaseTypePayload) => caseConfigService.createCaseType(p), 'Case type created');
export const useUpdateCaseType = () =>
  useCaseTypeMutation((v: { id: string; payload: UpdateCaseTypePayload }) => caseConfigService.updateCaseType(v.id, v.payload), 'Case type updated');
export const usePublishCaseType = () =>
  useCaseTypeMutation((id: string) => caseConfigService.publishCaseType(id), 'Case type published');
export const useArchiveCaseType = () =>
  useCaseTypeMutation((id: string) => caseConfigService.archiveCaseType(id), 'Case type archived');
export const useAddPlacement = () =>
  useCaseTypeMutation(
    (v: { caseTypeId: string; payload: PlacementPayload }) => caseConfigService.addPlacement(v.caseTypeId, v.payload),
    'Field added', placementsKey);
export const useUpdatePlacement = () =>
  useCaseTypeMutation(
    (v: { caseTypeId: string; fieldId: string; displayOrder: number }) =>
      caseConfigService.updatePlacement(v.caseTypeId, v.fieldId, { displayOrder: v.displayOrder }),
    'Field order updated', placementsKey);
export const useRemovePlacement = () =>
  useCaseTypeMutation(
    (v: { caseTypeId: string; fieldId: string }) => caseConfigService.removePlacement(v.caseTypeId, v.fieldId),
    'Field removed', placementsKey);

const stagesKey = (v: { caseTypeId: string }) => ['case-types', v.caseTypeId, 'stages'];
export const useCreateStageTemplate = () =>
  useCaseTypeMutation(
    (v: { caseTypeId: string; payload: CreateStageTemplatePayload }) => caseConfigService.createStageTemplate(v.caseTypeId, v.payload),
    'Stage created', stagesKey);
export const useUpdateStageTemplate = () =>
  useCaseTypeMutation(
    (v: { caseTypeId: string; templateId: string; payload: UpdateStageTemplatePayload }) =>
      caseConfigService.updateStageTemplate(v.caseTypeId, v.templateId, v.payload),
    'Stage updated', stagesKey);
export const useArchiveStageTemplate = () =>
  useCaseTypeMutation(
    (v: { caseTypeId: string; templateId: string }) => caseConfigService.archiveStageTemplate(v.caseTypeId, v.templateId),
    'Stage archived', stagesKey);
export const useReorderStageTemplates = () =>
  useCaseTypeMutation(
    (v: { caseTypeId: string; orderedIds: string[] }) => caseConfigService.reorderStageTemplates(v.caseTypeId, v.orderedIds),
    'Stage order updated', stagesKey);
