import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../components/Modal';
import { useCreateCaseType, useUpdateCaseType } from '../../hooks/useCaseTypes';
import type { CaseType } from '../../types/caseConfig';
import {
  caseTypeFormSchema, buildCreateCaseTypePayload, buildUpdateCaseTypePayload, type CaseTypeFormValues,
} from './caseTypeSchema';
import { PlacementEditor } from './PlacementEditor';
import { StageTemplateEditor } from './StageTemplateEditor';
import { ComponentsEditor } from './ComponentsEditor';

interface Props { isOpen: boolean; onClose: () => void; caseType?: CaseType | null }

const EMPTY: CaseTypeFormValues = { key: '', name: '', description: '' };
const row = { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 } as const;
const err = { color: 'var(--color-danger)', fontSize: 12 } as const;

export function CaseTypeFormModal({ isOpen, onClose, caseType }: Props) {
  const isEdit = !!caseType;
  const archived = isEdit && caseType!.status === 'ARCHIVED';
  const create = useCreateCaseType();
  const update = useUpdateCaseType();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CaseTypeFormValues>({
    resolver: zodResolver(caseTypeFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (isOpen) reset(caseType ? { key: caseType.key, name: caseType.name, description: caseType.description ?? '' } : EMPTY);
  }, [isOpen, caseType, reset]);

  const onSubmit = (form: CaseTypeFormValues) => {
    if (isEdit) update.mutate({ id: caseType!.id, payload: buildUpdateCaseTypePayload(form) }, { onSuccess: onClose });
    else create.mutate(buildCreateCaseTypePayload(form), { onSuccess: onClose });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit case type' : 'New case type'}
      size="xl"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="case-type-form" disabled={archived || create.isPending || update.isPending}>{isEdit ? (update.isPending ? 'Saving…' : 'Save') : (create.isPending ? 'Creating…' : 'Create')}</button>
        </div>
      }
    >
        <div className="space-y-8">
          {archived && (
            <div role="alert" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)', borderLeft: '3px solid var(--color-warning)', color: 'var(--text-secondary)', fontSize: 13 }}>
              This case type is archived and cannot be edited.
            </div>
          )}
          <form id="case-type-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <section>
              <div className="type-micro" style={{ marginBottom: 'var(--space-3)' }}>Case type details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <div style={row}>
                  <label className="type-ui" htmlFor="ct-key">Key</label>
                  <input id="ct-key" className="input" readOnly={isEdit} disabled={isEdit} {...register('key')} />
                  {errors.key && <span role="alert" style={err}>{errors.key.message}</span>}
                </div>
                <div style={row}>
                  <label className="type-ui" htmlFor="ct-name">Name</label>
                  <input id="ct-name" className="input" disabled={archived} {...register('name')} />
                  {errors.name && <span role="alert" style={err}>{errors.name.message}</span>}
                </div>
                <div style={row} className="sm:col-span-2">
                  <label className="type-ui" htmlFor="ct-description">Description</label>
                  <textarea id="ct-description" className="input" style={{ minHeight: 88, height: 'auto', padding: 'var(--space-2) var(--space-4)' }} disabled={archived} {...register('description')} />
                  {errors.description && <span role="alert" style={err}>{errors.description.message}</span>}
                </div>
              </div>
            </section>
            {isEdit
              ? (
                <section>
                  <div className="type-micro" style={{ marginBottom: 'var(--space-3)' }}>Field placement</div>
                  <PlacementEditor caseTypeId={caseType!.id} disabled={archived} />
                </section>
              )
              : <div className="type-ui" style={{ color: 'var(--text-tertiary)' }}>Save the case type first, then place fields.</div>}
          </form>
          {/* outside the <form>: the stage modal has its own form and Modal does not portal */}
          {isEdit && (
            <section>
              <div className="type-micro" style={{ marginBottom: 'var(--space-3)' }}>Stages</div>
              <StageTemplateEditor caseTypeId={caseType!.id} disabled={archived} />
            </section>
          )}
          {isEdit && (
            <section>
              <div className="type-micro" style={{ marginBottom: 'var(--space-3)' }}>Components</div>
              <ComponentsEditor caseType={caseType!} disabled={archived} />
            </section>
          )}
        </div>
    </Modal>
  );
}
