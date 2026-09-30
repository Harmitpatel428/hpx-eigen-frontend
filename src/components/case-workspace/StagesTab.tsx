import { useState } from 'react';
import { toast } from 'sonner';
import { extractApiError } from '../../utils/extractApiError';
import { useAuth } from '../../auth/public';
import { Modal } from '../Modal';
import { caseWorkspaceService } from '../../services/case-workspace.service';
import {
  useCaseTimeline, useCaseForecast, useStartStage, useCompleteStage, useUnlockStage,
} from '../../hooks/useCaseWorkspace';
import type { CaseStage } from '../../types/caseConfig';
import { SlaBadge } from './SlaBadge';

const fmt = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '-');

type Dlg = { kind: 'override' | 'unlock'; stageId: string } | null;

export function StagesTab({ caseId }: { caseId: string }) {
  const { permissions } = useAuth();
  const { data: tl } = useCaseTimeline(caseId, true);
  const { data: forecast } = useCaseForecast(caseId, true);
  const start = useStartStage(caseId);
  const complete = useCompleteStage(caseId);
  const unlock = useUnlockStage(caseId);
  const [blocked, setBlocked] = useState<{ stageId: string; missing: number } | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [reason, setReason] = useState('');

  const stages: CaseStage[] = [...(tl?.stages ?? [])].sort((a, b) => a.sequence - b.sequence);
  const canOverride = permissions.can('case-stage:override');

  const onComplete = async (stageId: string) => {
    setBlocked(null);
    try {
      const res = await caseWorkspaceService.validateFieldValues(caseId);
      if (res.valid) complete.mutate({ stageId });
      else setBlocked({ stageId, missing: res.missing.length });
    } catch (e) {
      toast.error(extractApiError(e).message);
    }
  };

  const close = () => { setDlg(null); setReason(''); };
  const submit = () => {
    if (!dlg || !reason.trim()) return;
    if (dlg.kind === 'override') {
      complete.mutate({ stageId: dlg.stageId, override: true, reason: reason.trim() });
      setBlocked(null);
    } else unlock.mutate({ stageId: dlg.stageId, reason: reason.trim() });
    close();
  };

  return (
    <div>
      <section aria-label="Forecast" style={{ marginBottom: 16 }}>
        <strong>Projected completion: {fmt(forecast?.projectedCompletion)}</strong>
        <ul>
          {(forecast?.stages ?? []).map((f) => (
            <li key={f.stageKey}>{f.stageKey} · {f.estimateDays}d · {f.confidence}</li>
          ))}
        </ul>
      </section>

      {stages.map((s) => {
        const isBlocked = s.status === 'BLOCKED';
        return (
          <div key={s.id} data-testid={`stage-${s.key}`} style={{ borderBottom: '1px solid #e5e7eb', padding: '8px 0' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong>{s.label}</strong>
              <span style={{ fontSize: 12, background: '#f3f4f6', padding: '2px 8px', borderRadius: 999 }}>{s.status}</span>
              <SlaBadge state={s.slaState} />
              <span style={{ fontSize: 12 }}>
                Planned {fmt(s.plannedStart)} to {fmt(s.plannedFinish)} · Latest finish {fmt(s.latestFinish)}
              </span>
              {s.status === 'READY' && permissions.can('case-stage:start') && (
                <button disabled={isBlocked} onClick={() => start.mutate(s.id)}>Start</button>
              )}
              {s.status === 'IN_PROGRESS' && permissions.can('case-stage:complete') && (
                <button disabled={isBlocked} onClick={() => onComplete(s.id)}>Complete</button>
              )}
              {isBlocked && permissions.can('sla:unlock') && (
                <button onClick={() => setDlg({ kind: 'unlock', stageId: s.id })}>Unlock</button>
              )}
            </div>
            {isBlocked && (
              <div role="alert" style={{ background: '#fee2e2', color: '#991b1b', padding: 8, marginTop: 6, borderRadius: 4 }}>
                This stage is blocked (SLA breach). It must be unlocked to proceed.
              </div>
            )}
            {blocked?.stageId === s.id && (
              <div role="alert" style={{ color: '#991b1b', marginTop: 6 }}>
                Cannot complete: {blocked.missing} required field(s) missing.
                {canOverride && (
                  <button style={{ marginLeft: 8 }} onClick={() => setDlg({ kind: 'override', stageId: s.id })}>
                    Override &amp; complete
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Modal isOpen={!!dlg} onClose={close} title={dlg?.kind === 'unlock' ? 'Unlock stage' : 'Override & complete'} size="sm">
        <label>
          Reason
          <textarea aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} style={{ display: 'block', width: '100%' }} />
        </label>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button onClick={close}>Cancel</button>
          <button disabled={!reason.trim()} onClick={submit}>Confirm</button>
        </div>
      </Modal>
    </div>
  );
}
