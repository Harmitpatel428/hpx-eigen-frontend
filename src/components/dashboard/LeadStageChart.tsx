import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts';
import { leadService } from '../../services/lead.service';
import { SELECTABLE_STAGES, LEAD_STAGE_LABELS } from '../../domain/leadStage';

interface Row { key: string; label: string; count: number }

// Single-series magnitude chart: neutral bars, one accent on the leading stage.
// No legend (the title names the series); colours come from tokens so dark mode
// adapts without a separate palette.
const ChartTooltip: React.FC<{ active?: boolean; payload?: { payload: Row }[] }> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--surface-overlay)', border: '1px solid var(--border-medium)',
      borderRadius: 10, padding: '8px 12px', boxShadow: 'var(--shadow-overlay)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
        {d.count} {d.count === 1 ? 'lead' : 'leads'}
      </div>
    </div>
  );
};

export const LeadStageChart: React.FC = () => {
  const { data: counts, isLoading } = useQuery({
    queryKey: ['leads', 'stage-counts', 'overview'],
    queryFn: () => leadService.stageCounts(),
    staleTime: 60_000,
  });

  const rows: Row[] = SELECTABLE_STAGES
    .map((key) => ({ key, label: LEAD_STAGE_LABELS[key], count: counts?.[key] ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  const total = rows.reduce((s, r) => s + r.count, 0);
  const maxCount = rows.length ? rows[0].count : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-6)' }}>
        <h2 className="type-title">Leads by stage</h2>
        {total > 0 && (
          <span className="type-ui" style={{ color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
            {total} total
          </span>
        )}
      </div>

      {isLoading ? (
        <div style={{ height: 240, borderRadius: 16, backgroundColor: 'var(--bg-muted)', animation: 'pulse 1.5s infinite' }} />
      ) : rows.length === 0 ? (
        <div style={{
          height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-tertiary)', fontSize: 14,
          border: '1px solid var(--border-light)', borderRadius: 16,
        }}>
          No leads yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 44)}>
          <BarChart layout="vertical" data={rows} margin={{ top: 0, right: 44, bottom: 0, left: 8 }} barCategoryGap={10}>
            <XAxis type="number" hide domain={[0, maxCount * 1.08]} />
            <YAxis
              type="category" dataKey="label" width={150}
              tickLine={false} axisLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 13 }}
            />
            <Tooltip cursor={{ fill: 'var(--bg-muted)', opacity: 0.5 }} content={<ChartTooltip />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.key} fill={r.count === maxCount ? 'var(--color-info)' : 'var(--text-tertiary)'} />
              ))}
              <LabelList
                dataKey="count" position="right"
                style={{ fill: 'var(--text-secondary)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default LeadStageChart;
