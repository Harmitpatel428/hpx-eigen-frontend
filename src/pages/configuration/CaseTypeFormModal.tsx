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

interface Props { isOpen: boolean; onClose: () => void; caseType?: CaseType | null }

const EMPTY: CaseTypeFormValues = { key: '', name: '', description: '' };
const row = { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 } as const;
const err = { color: '#dc2626', fontSize: 12 } as const;

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
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit case type' : 'New case type'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)}>
        {archived && (
          <div role="alert" style={{ ...row, background: 'rgba(245,158,11,0.1)', padding: 8, borderRadius: 6 }}>
            This case type is archived and cannot be edited.
          </div>
        )}
        <div style={row}>
          <label className="type-ui" htmlFor="ct-key">Key</label>
          <input id="ct-key" className="input" readOnly={isEdit} disabled={isEdit} {...register('key')} />
          {errors.key && <span style={err}>{errors.key.message}</span>}
        </div>
        <div style={row}>
          <label className="type-ui" htmlFor="ct-name">Name</label>
          <input id="ct-name" className="input" disabled={archived} {...register('name')} />
          {errors.name && <span style={err}>{errors.name.message}</span>}
        </div>
        <div style={row}>
          <label className="type-ui" htmlFor="ct-description">Description</label>
          <textarea id="ct-description" className="input" disabled={archived} {...register('description')} />
          {errors.description && <span style={err}>{errors.description.message}</span>}
        </div>

        <div style={{ marginBottom: 12 }}>
          {isEdit
            ? <PlacementEditor caseTypeId={caseType!.id} disabled={archived} />
            : <div className="type-ui">Save the case type first, then place fields.</div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={archived || create.isPending || update.isPending}>{isEdit ? 'Save' : 'Create'}</button>
        </div>
      </form>
      {/* outside the <form>: the stage modal has its own form and Modal does not portal */}
      {isEdit && <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-medium)' }}><StageTemplateEditor caseTypeId={caseType!.id} disabled={archived} /></div>}
    </Modal>
  );
}
