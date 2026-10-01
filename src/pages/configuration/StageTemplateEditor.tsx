import { useState } from 'react';
import { useAuth } from '../../auth/public';
import { useStageTemplates, useArchiveStageTemplate, useReorderStageTemplates } from '../../hooks/useCaseTypes';
import type { CaseStageTemplate } from '../../types/caseConfig';
import { StageTemplateFormModal } from './StageTemplateFormModal';

interface Props { caseTypeId: string; disabled?: boolean }

// ponytail: Up/Down reorder like PlacementEditor; dnd-kit drag-reorder is the later upgrade
export function StageTemplateEditor({ caseTypeId, disabled = false }: Props) {
  const { permissions } = useAuth();
  const canEdit = permissions.can('case-timeline:manage') && !disabled;
  const { data: templates = [] } = useStageTemplates(caseTypeId);
  const archive = useArchiveStageTemplate();
  const reorder = useReorderStageTemplates();
  const [editing, setEditing] = useState<CaseStageTemplate | null>(null);
  const [open, setOpen] = useState(false);

  const sorted = [...templates].sort((a, b) => a.sequence - b.sequence);
  const move = (i: number, j: number) => {
    const ids = sorted.map((t) => t.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder.mutate({ caseTypeId, orderedIds: ids });
  };
  const show = (t: CaseStageTemplate | null) => { setEditing(t); setOpen(true); };

  return (
    <div>
      <div className="type-ui" style={{ fontWeight: 600, marginBottom: 8 }}>Stage templates</div>
      {sorted.length === 0 && <div className="type-ui">No stages defined yet.</div>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {sorted.map((t, i) => (
          <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span style={{ flex: 1 }}>
              {t.sequence}. {t.label}{' '}
              <span className="type-ui">
                ({t.key}) · {t.durationValue ?? '-'} {t.durationType ?? ''}
                {t.externalWaiting ? ' · external' : ''}{t.hardBlock ? ' · hard block' : ''}{t.enforceRequiredOnComplete ? ' · enforce required' : ''}
              </span>
            </span>
            {canEdit && (<>
              <button className="btn btn-ghost" type="button" aria-label={`Move ${t.label} up`} disabled={reorder.isPending || i === 0} onClick={() => move(i, i - 1)}>Up</button>
              <button className="btn btn-ghost" type="button" aria-label={`Move ${t.label} down`} disabled={reorder.isPending || i === sorted.length - 1} onClick={() => move(i, i + 1)}>Down</button>
              <button className="btn btn-ghost" type="button" aria-label={`Edit ${t.label}`} onClick={() => show(t)}>Edit</button>
              <button className="btn btn-ghost" type="button" aria-label={`Archive ${t.label}`}
                onClick={() => window.confirm(`Archive stage "${t.label}"?`) && archive.mutate({ caseTypeId, templateId: t.id })}>Archive</button>
            </>)}
          </li>
        ))}
      </ul>
      {canEdit && <button className="btn btn-ghost" type="button" style={{ marginTop: 8 }} onClick={() => show(null)}>New stage</button>}
      <StageTemplateFormModal isOpen={open} onClose={() => setOpen(false)} caseTypeId={caseTypeId} template={editing} />
    </div>
  );
}
