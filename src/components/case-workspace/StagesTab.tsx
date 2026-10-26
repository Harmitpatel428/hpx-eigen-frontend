import { useCallback, useState } from 'react';
import { toast } from '../notifications/notify';
import { extractApiError } from '../../utils/extractApiError';
import { useAuth } from '../../auth/public';
import { Modal } from '../Modal';
import { caseWorkspaceService } from '../../services/case-workspace.service';
import {
  useCaseTimeline, useCreateTimeline, useCaseForecast, useStartStage, useCompleteStage, useUnlockStage,
  useSetTarget, useApproveException, usePauseStage, useResumeStage, useReopenStage, useSkipStage, useOverrideDuration,
} from '../../hooks/useCaseWorkspace';
import type { CaseStage } from '../../types/caseConfig';
import { useStageTemplates } from '../../hooks/useCaseTypes';
import { SlaBadge } from './SlaBadge';
import { EmptyState, LoadingRows } from '../EmptyState';
import { Card } from '../ui/Card';

const fmt = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '-');

type Dlg =
  | { kind: 'override' | 'unlock' | 'skip' | 'duration'; stageId: string }
  | { kind: 'exception' }
  | { kind: 'target' }
  | null;

const LIVE = ['READY', 'IN_PROGRESS', 'WAITING_EXTERNAL'];
const TITLES: Record<string, string> = {
  unlock: 'Unlock stage', override: 'Override & complete', skip: 'Skip stage',
  duration: 'Override duration', exception: 'Approve exception', target: 'Set target',
};

export function StagesTab({ caseId, caseTypeId }: { caseId: string; caseTypeId: string | null }) {
  const { permissions } = useAuth();
  const { data: tl, isLoading: tlLoading } = useCaseTimeline(caseId, true);
  const { data: forecast } = useCaseForecast(caseId, true);
  const { data: templates = [], isLoading: tplLoading } = useStageTemplates(caseTypeId);
  const createTimeline = useCreateTimeline(caseId);
  const start = useStartStage(caseId);
  const complete = useCompleteStage(caseId);
  const unlock = useUnlockStage(caseId);
  const setTarget = useSetTarget(caseId);
  const approve = useApproveException(caseId);
  const pause = usePauseStage(caseId);
  const resume = useResumeStage(caseId);
  const reopen = useReopenStage(caseId);
  const skip = useSkipStage(caseId);
  const overrideDur = useOverrideDuration(caseId);
  const [days, setDays] = useState('');
  const [date, setDate] = useState('');
  const [blocked, setBlocked] = useState<{ stageId: string; missing: number } | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [reason, setReason] = useState('');

  const stages: CaseStage[] = [...(tl?.stages ?? [])].sort((a, b) => a.sequence - b.sequence);
  const canOverride = permissions.can('case-stage:override');
  const timeline = tl?.timeline;
  const daysValid = /^\d+$/.test(days.trim());

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

  // stable ref: Modal re-focuses its first button whenever onClose changes (would steal focus per keystroke)
  const close = useCallback(() => { setDlg(null); setReason(''); setDays(''); setDate(''); }, []);
  const submit = () => {
    if (!dlg) return;
    if (dlg.kind === 'target') {
      if (!date) return;
      setTarget.mutate(date);
      close();
      return;
    }
    if (!reason.trim()) return;
    const r = reason.trim();
    if (dlg.kind === 'override') {
      complete.mutate({ stageId: dlg.stageId, override: true, reason: r });
      setBlocked(null);
    } else if (dlg.kind === 'unlock') unlock.mutate({ stageId: dlg.stageId, reason: r });
    else if (dlg.kind === 'skip') skip.mutate({ stageId: dlg.stageId, reason: r });
    else if (dlg.kind === 'exception') approve.mutate(r);
    else {
      if (!daysValid) return;
      overrideDur.mutate({ stageId: dlg.stageId, remainingDuration: Number(days), reason: r });
    }
    close();
  };
  const clearTarget = () => { setTarget.mutate(null); close(); };
  const submitDisabled =
    dlg?.kind === 'target' ? !date : !reason.trim() || (dlg?.kind === 'duration' && !daysValid);

  if (tlLoading || tplLoading) return <LoadingRows />;
  if (!timeline && stages.length === 0) {
    return templates.length > 0 ? (
      permissions.can('case-timeline:manage') ? (
        <EmptyState title="No timeline yet." action={<button className="btn btn-primary" type="button" disabled={createTimeline.isPending} onClick={() => createTimeline.mutate()}>Create timeline</button>} />
      ) : (
        <EmptyState title="No timeline yet." />
      )
    ) : (
      <EmptyState title="No stage templates">This case type has no stage templates yet</EmptyState>
    );
  }

  const overdueCount = stages.filter((s) => s.slaState === 'OVERDUE').length;
  const atRiskCount = stages.filter((s) => s.slaState === 'AT_RISK').length;
  const estimate = new Map((forecast?.stages ?? []).map((f) => [f.stageKey, f]));
  const stat = (label: string, value: string | number, danger = false) => (
    <Card style={{ padding: 'var(--space-4) var(--space-6)' }}>
      <div className="type-micro">{label}</div>
      <div className="tabular-nums" style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-lg)', fontWeight: 600, color: danger ? 'var(--color-danger)' : 'var(--text-primary)' }}>{value}</div>
    </Card>
  );
  const alertRow = { display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', background: 'rgba(220,38,38,0.08)', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <section aria-label="Timeline target" style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap', minHeight: 36 }} className="type-ui">
        <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: 'auto' }}>Stage timeline</h3>
        <span className="tabular-nums">Target: {fmt(timeline?.targetDate)}</span>
        {timeline?.feasible === false && (
          <span role="status">Infeasible — {timeline.deficitDays ?? 0} days short</span>
        )}
        {timeline?.exceptionApproved && <span>Exception approved</span>}
        {permissions.can('case-timeline:manage') && (
          <button className="btn btn-ghost" onClick={() => setDlg({ kind: 'target' })}>Set target</button>
        )}
        {timeline?.feasible === false && !timeline.exceptionApproved && permissions.can('case-exception:approve') && (
          <button className="btn btn-ghost" onClick={() => setDlg({ kind: 'exception' })}>Approve exception</button>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 'var(--space-4)' }}>
        {stat('Projected completion', fmt(forecast?.projectedCompletion))}
        {stat('Overdue', overdueCount, overdueCount > 0)}
        {stat('At risk', atRiskCount)}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
      {stages.map((s, i) => {
        const isBlocked = s.status === 'BLOCKED';
        const est = estimate.get(s.key);
        return (
          <div key={s.id} data-testid={`stage-${s.key}`} style={{ padding: 'var(--space-4) var(--space-6)', borderTop: i ? '1px solid var(--border-light)' : undefined, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr) 250px 280px', gap: 'var(--space-4)', alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div className="type-ui" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 'var(--text-micro)', color: 'var(--text-tertiary)' }}>{s.key}{est ? ` · ${est.estimateDays}d est.` : ''}</div>
              </div>
              <div className="tabular-nums" style={{ fontFamily: 'monospace', fontSize: 'var(--text-micro)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>Planned {fmt(s.plannedStart)} → {fmt(s.plannedFinish)}</div>
                <div style={{ color: 'var(--text-tertiary)' }}>Latest finish {fmt(s.latestFinish)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', whiteSpace: 'nowrap' }}>
                <span className="chip" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, letterSpacing: '0.04em' }}>{s.status}</span>
                <SlaBadge state={s.slaState} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {s.status === 'READY' && permissions.can('case-stage:start') && (
                <button className="btn btn-ghost" disabled={isBlocked} onClick={() => start.mutate(s.id)}>Start</button>
              )}
              {s.status === 'IN_PROGRESS' && permissions.can('case-stage:complete') && (
                <button className="btn btn-ghost" disabled={isBlocked} onClick={() => onComplete(s.id)}>Complete</button>
              )}
              {/* ponytail: backend is authoritative on the stage machine; it 422s illegal transitions (hooks toast the error). */}
              {!isBlocked && s.status === 'IN_PROGRESS' && permissions.can('case-stage:pause') && (
                <button className="btn btn-ghost" onClick={() => pause.mutate({ stageId: s.id })}>Pause</button>
              )}
              {!isBlocked && s.status === 'WAITING_EXTERNAL' && permissions.can('case-stage:resume') && (
                <button className="btn btn-ghost" onClick={() => resume.mutate({ stageId: s.id })}>Resume</button>
              )}
              {!isBlocked && LIVE.includes(s.status) && permissions.can('case-stage:skip') && (
                <button className="btn btn-ghost" onClick={() => setDlg({ kind: 'skip', stageId: s.id })}>Skip</button>
              )}
              {!isBlocked && (s.status === 'COMPLETED' || s.status === 'SKIPPED') && permissions.can('case-stage:reopen') && (
                <button className="btn btn-ghost" onClick={() => reopen.mutate({ stageId: s.id })}>Reopen</button>
              )}
              {!isBlocked && LIVE.includes(s.status) && canOverride && (
                <button className="btn btn-ghost" onClick={() => setDlg({ kind: 'duration', stageId: s.id })}>Override duration</button>
              )}
              </div>
            </div>
            {isBlocked && (
              <div role="alert" style={alertRow}>
                <span style={{ flex: 1 }}>This stage is blocked (SLA breach). It must be unlocked to proceed.</span>
                {permissions.can('sla:unlock') && (
                  <button className="btn btn-secondary" style={{ height: 30 }} onClick={() => setDlg({ kind: 'unlock', stageId: s.id })}>Unlock</button>
                )}
              </div>
            )}
            {blocked?.stageId === s.id && (
              <div role="alert" style={alertRow}>
                <span style={{ flex: 1 }}>Cannot complete: {blocked.missing} required field(s) missing.</span>
                {canOverride && (
                  <button className="btn btn-secondary" style={{ height: 30 }} onClick={() => setDlg({ kind: 'override', stageId: s.id })}>
                    Override &amp; complete
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      </Card>

      <Modal isOpen={!!dlg} onClose={close} title={dlg ? TITLES[dlg.kind] : ''} size="sm">
        {dlg?.kind === 'target' ? (
          <label>
            Target date
            <input type="date" aria-label="Target date" value={date} onChange={(e) => setDate(e.target.value)} style={{ display: 'block' }} />
          </label>
        ) : (
          <>
            {dlg?.kind === 'duration' && (
              <label>
                Remaining days
                <input type="number" min={0} step={1} aria-label="Remaining days" value={days} onChange={(e) => setDays(e.target.value)} style={{ display: 'block' }} />
              </label>
            )}
            <label>
              Reason
              <textarea aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} style={{ display: 'block', width: '100%' }} />
            </label>
          </>
        )}
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={close}>Cancel</button>
          {dlg?.kind === 'target' && <button className="btn btn-ghost" onClick={clearTarget}>Clear</button>}
          <button className="btn btn-primary" disabled={submitDisabled} onClick={submit}>Confirm</button>
        </div>
      </Modal>
    </div>
  );
}
