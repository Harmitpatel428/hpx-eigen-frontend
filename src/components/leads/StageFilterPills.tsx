import { useState, useRef, memo } from 'react';
import type { LeadStage } from '../../types';

export const PILL_CLASS = 'stage-pill';
export const PILL_ACTIVE_CLASS = 'stage-pill--active';

export const STAGE_COLORS: Record<LeadStage, { bg: string; text: string; dot: string }> = {
  NEW:                 { bg: 'rgba(99,102,241,0.1)',  text: '#6366f1', dot: '#6366f1' },
  QUALIFIED:           { bg: 'rgba(16,185,129,0.1)',  text: '#059669', dot: '#059669' },
  INTERESTED:          { bg: 'rgba(13,148,136,0.1)',  text: '#0d9488', dot: '#0d9488' },
  FOLLOW_UP:           { bg: 'rgba(245,158,11,0.1)',  text: '#d97706', dot: '#d97706' },
  CALL_BACK_REQUESTED: { bg: 'rgba(249,115,22,0.1)',  text: '#ea580c', dot: '#ea580c' },
  CALL_NOT_RECEIVED:   { bg: 'rgba(239,68,68,0.08)',  text: '#dc2626', dot: '#dc2626' },
  OTHER:               { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', dot: '#6b7280' },
  DISQUALIFIED:        { bg: 'rgba(239,68,68,0.1)',   text: '#dc2626', dot: '#dc2626' },
  CONTACTED:           { bg: 'rgba(245,158,11,0.1)',  text: '#d97706', dot: '#d97706' },
  CONVERTED:           { bg: 'rgba(139,92,246,0.1)',  text: '#7c3aed', dot: '#7c3aed' },
};

const DEFAULT_STAGES: { key: LeadStage; label: string }[] = [
  { key: 'NEW',                 label: 'New'          },
  { key: 'QUALIFIED',           label: 'Qualified'    },
  { key: 'INTERESTED',          label: 'Interested'   },
  { key: 'FOLLOW_UP',           label: 'Follow-Up'    },
  { key: 'CALL_BACK_REQUESTED', label: 'Call Back'    },
  { key: 'CALL_NOT_RECEIVED',   label: 'Not Received' },
  { key: 'DISQUALIFIED',        label: 'Disqualified' },
  { key: 'OTHER',               label: 'Others'       },
];

const STAGE_ORDER_KEY = 'sales_dashboard_stage_order';

function saveStageOrder(keys: string[]) {
  try { localStorage.setItem(STAGE_ORDER_KEY, JSON.stringify(keys)); }
  catch { /* quota / private-browsing — in-memory order survives, just won't persist */ }
}

function loadStageOrder(): { key: LeadStage; label: string }[] {
  try {
    const raw = localStorage.getItem(STAGE_ORDER_KEY);
    if (!raw) return DEFAULT_STAGES;
    const keys = JSON.parse(raw) as string[];
    const ordered = keys
      .map(k => DEFAULT_STAGES.find(s => s.key === k))
      .filter((s): s is { key: LeadStage; label: string } => !!s);
    const missing = DEFAULT_STAGES.filter(s => !keys.includes(s.key));
    return [...ordered, ...missing];
  } catch { return DEFAULT_STAGES; }
}

interface StageFilterPillsProps {
  selectedStage: LeadStage | '';
  stageCounts: Record<string, number>;
  colourfulFilters: boolean;
  onSelect: (stage: LeadStage | '') => void;
}

export const StageFilterPills = memo(function StageFilterPills({
  selectedStage, stageCounts, colourfulFilters, onSelect,
}: StageFilterPillsProps) {
  const [stages, setStages] = useState(loadStageOrder);
  const dragIdx = useRef<number | null>(null);
  const handleClick = (stage: LeadStage | '') => {
    onSelect(stage);
  };

  const allActive = selectedStage === '';
  const allTotal = Object.values(stageCounts).reduce((s, n) => s + n, 0);

  return (
    <div style={{ display: 'flex', gap: 6, padding: '6px 12px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
      <button
        type="button"
        onClick={() => handleClick('')}
        className={`${PILL_CLASS}${allActive ? ` ${PILL_ACTIVE_CLASS}` : ''}`}
        style={allActive ? { color: '#0f172a', background: 'rgba(15,23,42,0.07)', borderColor: 'rgba(15,23,42,0.15)' } : undefined}
        aria-pressed={allActive}
      >
        <span className="stage-pill-dot" style={allActive ? { background: '#0f172a', opacity: 1 } : undefined} />
        All Leads
        {allTotal > 0 && <span className="stage-pill-count">{allTotal}</span>}
      </button>

      {stages.map(({ key, label }, i) => {
        const active = selectedStage === key;
        const sc = STAGE_COLORS[key];
        const count = stageCounts[key];
        return (
          <button
            key={key}
            type="button"
            draggable
            onDragStart={() => { dragIdx.current = i; }}
            onDragOver={e => {
              e.preventDefault();
              if (dragIdx.current === null || dragIdx.current === i) return;
              const next = [...stages];
              const [moved] = next.splice(dragIdx.current, 1);
              next.splice(i, 0, moved);
              dragIdx.current = i;
              setStages(next);
            }}
            onDrop={() => {
              dragIdx.current = null;
              saveStageOrder(stages.map(s => s.key));
            }}
            onKeyDown={e => {
              if (e.key === 'ArrowLeft' && i > 0) {
                e.preventDefault();
                const next = [...stages];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                setStages(next);
                saveStageOrder(next.map(s => s.key));
              } else if (e.key === 'ArrowRight' && i < stages.length - 1) {
                e.preventDefault();
                const next = [...stages];
                [next[i], next[i + 1]] = [next[i + 1], next[i]];
                setStages(next);
                saveStageOrder(next.map(s => s.key));
              }
            }}
            onClick={() => handleClick(active ? '' : key)}
            className={`${PILL_CLASS}${active ? ` ${PILL_ACTIVE_CLASS}` : ''}`}
            style={active
              ? { color: sc.text, background: sc.bg, borderColor: sc.text, cursor: 'grab' }
              : colourfulFilters
              ? { color: sc.text, background: sc.bg, borderColor: 'transparent', cursor: 'grab' }
              : { cursor: 'grab' }}
            aria-pressed={active}
            aria-label={`${label}${count ? ` (${count})` : ''} — drag or use arrow keys to reorder`}
          >
            <span className="stage-pill-dot" style={active ? { background: sc.text, opacity: 1 } : undefined} />
            {label}
            {count != null && count > 0 && (
              <span className="stage-pill-count">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
});
