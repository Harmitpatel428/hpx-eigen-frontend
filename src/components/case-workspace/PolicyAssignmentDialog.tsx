import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Modal } from '../Modal';
import { caseWorkspaceService, type AssignPoliciesPayload } from '../../services/case-workspace.service';
import { useAssignPolicies } from '../../hooks/useCaseWorkspace';
import { extractApiError } from '../../utils/extractApiError';
import type { CaseType } from '../../types/caseConfig';
import type { DocCasePolicyAssignment } from '../../types';

interface Props {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  caseTypes: CaseType[];
  existing: DocCasePolicyAssignment[];
}

interface Row {
  caseTypeId: string;
  name: string;
  archived: boolean;            // caseType ARCHIVED/soft-deleted → components read-only
  retained: boolean;            // already assigned (incl. derived legacy)
  componentIds: string[];
  initialComponentIds: string[];
  proposalDate: string;
  actualDate: string;
  retainedComponentNames: string[]; // for archived read-only display
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && new Set(a).size === new Set([...a, ...b]).size;
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

function rowsFromExisting(existing: DocCasePolicyAssignment[]): Row[] {
  return existing.map((a) => {
    const archived = a.caseType.status === 'ARCHIVED' || a.caseType.deletedAt != null;
    const componentIds = a.components.map((c) => c.componentId);
    return {
      caseTypeId: a.caseTypeId,
      name: a.caseType.name,
      archived,
      retained: true,
      componentIds,
      initialComponentIds: componentIds,
      proposalDate: toDateInput(a.proposalDate),
      actualDate: toDateInput(a.actualDate),
      retainedComponentNames: a.components.map((c) => c.component.name),
    };
  });
}

export function PolicyAssignmentDialog({ caseId, isOpen, onClose, caseTypes, existing }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const mutation = useAssignPolicies(caseId);

  // Reset from the read model each time the dialog opens.
  useEffect(() => {
    if (isOpen) { setRows(rowsFromExisting(existing)); mutation.reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Load active components for every non-archived row (parallel, cache-keyed).
  const activeRows = rows.filter((r) => !r.archived);
  const componentQueries = useQueries({
    queries: activeRows.map((r) => ({
      queryKey: ['case-types', r.caseTypeId, 'components', { includeInactive: false }],
      queryFn: () => caseWorkspaceService.listCaseTypeComponents(r.caseTypeId, false),
      enabled: isOpen,
      staleTime: 30_000,
    })),
  });
  const compByType = useMemo(() => {
    const m = new Map<string, { isLoading: boolean; isError: boolean; data: { id: string; name: string; isMandatory: boolean }[] }>();
    activeRows.forEach((r, i) => {
      const q = componentQueries[i];
      m.set(r.caseTypeId, { isLoading: q?.isLoading ?? true, isError: q?.isError ?? false, data: (q?.data as any[]) ?? [] });
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, componentQueries.map((q) => `${q.status}:${(q.data as any[])?.length ?? 0}`).join('|')]);

  const primaryCaseTypeId = rows.find((r) => !r.archived)?.caseTypeId ?? rows[0]?.caseTypeId;
  const addable = caseTypes.filter((ct) => ct.status === 'ACTIVE' && !rows.some((r) => r.caseTypeId === ct.id));

  const addPolicy = (caseTypeId: string) => {
    const ct = caseTypes.find((c) => c.id === caseTypeId);
    if (!ct) return;
    setRows((prev) => [...prev, {
      caseTypeId, name: ct.name, archived: false, retained: false,
      componentIds: [], initialComponentIds: [], proposalDate: '', actualDate: '', retainedComponentNames: [],
    }]);
  };
  const removePolicy = (caseTypeId: string) => setRows((prev) => prev.filter((r) => r.caseTypeId !== caseTypeId));
  const patchRow = (caseTypeId: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.caseTypeId === caseTypeId ? { ...r, ...patch } : r)));
  const toggleComponent = (caseTypeId: string, componentId: string) =>
    setRows((prev) => prev.map((r) => {
      if (r.caseTypeId !== caseTypeId) return r;
      const has = r.componentIds.includes(componentId);
      return { ...r, componentIds: has ? r.componentIds.filter((c) => c !== componentId) : [...r.componentIds, componentId] };
    }));

  // ── Save-enabled rules (mirror the backend) ──
  const disabledReason = (() => {
    if (rows.length === 0) return 'Select at least one policy.';
    for (const r of activeRows) {
      const info = compByType.get(r.caseTypeId);
      if (!info || info.isLoading) return 'Loading components…';
      if (info.isError) return 'Could not load components for a policy.';
      const hasActive = info.data.length > 0;
      const changed = !sameSet(r.componentIds, r.initialComponentIds);
      const requireSelection = hasActive && (!r.retained || changed);
      if (requireSelection && !r.componentIds.some((cid) => info.data.some((c) => c.id === cid))) {
        return `Select at least one component for "${r.name}".`;
      }
    }
    return null;
  })();
  const canSave = disabledReason === null && !mutation.isPending;

  const save = () => {
    const payload: AssignPoliciesPayload = {
      policies: rows.map((r) => ({
        caseTypeId: r.caseTypeId,
        componentIds: r.componentIds,
        proposalDate: r.proposalDate || null,
        actualDate: r.actualDate || null,
      })),
      primaryCaseTypeId,
    };
    mutation.mutate(payload, { onSuccess: () => onClose() });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure policies" size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {rows.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No policies selected yet. Add one below.</p>
        )}

        {rows.map((r) => {
          const info = compByType.get(r.caseTypeId);
          const isPrimary = r.caseTypeId === primaryCaseTypeId;
          return (
            <div key={r.caseTypeId} className="surface" style={{ padding: 12, borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{r.name}</strong>
                {isPrimary && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-subtle)' }}>PRIMARY</span>}
                {r.archived && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, color: 'var(--text-secondary)', border: '1px solid var(--border-medium)' }}>ARCHIVED</span>}
                <button type="button" className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => removePolicy(r.caseTypeId)}>Remove</button>
              </div>

              {/* Components */}
              {r.archived ? (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Components (read-only): {r.retainedComponentNames.length ? r.retainedComponentNames.join(', ') : 'none'}
                </div>
              ) : info?.isLoading ? (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loading components…</div>
              ) : info?.isError ? (
                <div style={{ fontSize: 12, color: '#dc2626' }}>Could not load components.</div>
              ) : info && info.data.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {info.data.map((c) => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <input type="checkbox" checked={r.componentIds.includes(c.id)} onChange={() => toggleComponent(r.caseTypeId, c.id)} />
                      {c.name}{c.isMandatory && <span style={{ color: 'var(--text-secondary)' }}> (mandatory)</span>}
                    </label>
                  ))}
                  {/* Retained-but-now-inactive selections stay checked for traceability */}
                  {r.componentIds.filter((cid) => !info.data.some((c) => c.id === cid)).map((cid) => {
                    const name = existing.find((e) => e.caseTypeId === r.caseTypeId)?.components.find((c) => c.componentId === cid)?.component.name ?? cid;
                    return (
                      <label key={cid} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <input type="checkbox" checked onChange={() => toggleComponent(r.caseTypeId, cid)} />
                        {name} (archived)
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No components configured for this policy.</div>
              )}

              {/* Dates */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <label style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  Proposal date
                  <input className="input" type="date" value={r.proposalDate} onChange={(e) => patchRow(r.caseTypeId, { proposalDate: e.target.value })} />
                </label>
                <label style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  Actual date
                  <input className="input" type="date" value={r.actualDate} onChange={(e) => patchRow(r.caseTypeId, { actualDate: e.target.value })} />
                </label>
              </div>
            </div>
          );
        })}

        {addable.length > 0 && (
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            Add policy
            <select className="input" value="" onChange={(e) => e.target.value && addPolicy(e.target.value)} style={{ maxWidth: 240 }}>
              <option value="">Select a policy…</option>
              {addable.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
          </label>
        )}

        {mutation.isError && (
          <div role="alert" style={{ fontSize: 12, color: '#dc2626' }}>{extractApiError(mutation.error).message}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
          {disabledReason && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{disabledReason}</span>}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!canSave} onClick={save}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
