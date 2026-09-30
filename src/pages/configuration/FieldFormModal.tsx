import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../components/Modal';
import { useDepartment } from '../../context/DepartmentContext';
import { useCreateField, useUpdateField } from '../../hooks/useCaseFields';
import { isSelectType, type CaseFieldDefinition } from '../../types/caseConfig';
import {
  FIELD_TYPES, fieldFormSchema, fieldToFormValues, buildCreatePayload, buildUpdatePayload, type FieldFormValues,
} from './fieldSchema';
import { FieldOptionsEditor } from './FieldOptionsEditor';

interface Props { isOpen: boolean; onClose: () => void; field?: CaseFieldDefinition | null }

const EMPTY: FieldFormValues = {
  key: '', name: '', description: '', type: 'TEXT', reportable: false, filterable: false,
  minLength: '', maxLength: '', pattern: '', min: '', max: '', integer: false,
  minDate: '', maxDate: '', minSelections: '', maxSelections: '',
};

const row = { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 } as const;
const err = { color: '#dc2626', fontSize: 12 } as const;

export function FieldFormModal({ isOpen, onClose, field }: Props) {
  const isEdit = !!field;
  const { activeDepartment } = useDepartment();
  const createField = useCreateField();
  const updateField = useUpdateField();
  const [deptError, setDeptError] = useState(false);
  const locked = isEdit && (field!.status === 'READ_ONLY' || field!.status === 'ARCHIVED');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FieldFormValues>({
    resolver: zodResolver(fieldFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (isOpen) { reset(field ? fieldToFormValues(field) : EMPTY); setDeptError(false); }
  }, [isOpen, field, reset]);

  const type = watch('type');

  const onSubmit = (form: FieldFormValues) => {
    if (isEdit) {
      updateField.mutate({ id: field!.id, payload: buildUpdatePayload(form) }, { onSuccess: onClose });
      return;
    }
    if (!activeDepartment) { setDeptError(true); return; }
    createField.mutate(buildCreatePayload(form, activeDepartment.id), { onSuccess: onClose });
  };

  const text = (name: Exclude<keyof FieldFormValues, 'reportable' | 'filterable' | 'integer'>, label: string, inputType = 'text') => (
    <div style={row}>
      <label className="type-ui" htmlFor={`ff-${name}`}>{label}</label>
      <input id={`ff-${name}`} className="input" type={inputType} disabled={locked} {...register(name)} />
      {errors[name] && <span style={err}>{String(errors[name]?.message)}</span>}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit field' : 'New field'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)}>
        {locked && (
          <div role="alert" style={{ ...row, background: 'rgba(245,158,11,0.1)', padding: 8, borderRadius: 6 }}>
            This field is {field!.status} and cannot be edited.
          </div>
        )}
        <div style={row}>
          <label className="type-ui" htmlFor="ff-key">Key</label>
          <input id="ff-key" className="input" readOnly={isEdit} disabled={isEdit} {...register('key')} />
          {errors.key && <span style={err}>{errors.key.message}</span>}
        </div>
        {text('name', 'Name')}
        <div style={row}>
          <label className="type-ui" htmlFor="ff-description">Description</label>
          <textarea id="ff-description" className="input" disabled={locked} {...register('description')} />
          {errors.description && <span style={err}>{errors.description.message}</span>}
        </div>
        <div style={row}>
          <label className="type-ui" htmlFor="ff-type">Type</label>
          <select id="ff-type" className="input" disabled={isEdit} {...register('type')}>
            {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <label><input type="checkbox" disabled={locked} {...register('reportable')} /> Reportable</label>
          <label><input type="checkbox" disabled={locked} {...register('filterable')} /> Filterable</label>
        </div>

        {(type === 'TEXT' || type === 'TEXTAREA') && (<>
          {text('minLength', 'Min length', 'number')}{text('maxLength', 'Max length', 'number')}{text('pattern', 'Pattern (regex)')}
        </>)}
        {type === 'NUMBER' && (<>
          {text('min', 'Min', 'number')}{text('max', 'Max', 'number')}
          <label style={row}><span><input type="checkbox" disabled={locked} {...register('integer')} /> Integer only</span></label>
        </>)}
        {type === 'DATE' && (<>{text('minDate', 'Min date', 'date')}{text('maxDate', 'Max date', 'date')}</>)}
        {type === 'MULTI_SELECT' && (<>
          {text('minSelections', 'Min selections', 'number')}{text('maxSelections', 'Max selections', 'number')}
        </>)}

        {isSelectType(type) && (
          <div style={{ marginBottom: 12 }}>
            <FieldOptionsEditor fieldId={isEdit ? field!.id : null} disabled={locked} />
          </div>
        )}

        {deptError && <div role="alert" style={err}>Select a department first.</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={locked || createField.isPending || updateField.isPending}>
            {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
