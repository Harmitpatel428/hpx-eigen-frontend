import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts';

export interface StageDatum { label: string; value: number }

// Reusable single-series magnitude chart: neutral horizontal bars with the
// leading stage in the blue accent, direct value labels, token colours (dark
// mode adapts), plus loading and empty states. No legend — the caller's title
// names the series.
const ChartTooltip: React.FC<{
  active?: boolean;
  payload?: { payload: StageDatum }[];
  fmt?: (d: StageDatum) => string;
}> = ({ active, payload, fmt }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--surface-overlay)', border: '1px solid var(--border-medium)',
      borderRadius: 10, padding: '8px 12px', boxShadow: 'var(--shadow-overlay)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
        {fmt ? fmt(d) : d.value}
      </div>
    </div>
  );
};

interface StageBarChartProps {
  data: StageDatum[];
  isLoading?: boolean;
  emptyMessage: string;
  formatValue?: (v: number) => string;
  tooltipLine?: (d: StageDatum) => string;
}

export const StageBarChart: React.FC<StageBarChartProps> = ({
  data, isLoading, emptyMessage, formatValue = (v) => String(v), tooltipLine,
}) => {
  const rows = [...data].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const maxValue = rows.length ? rows[0].value : 0;

  if (isLoading) {
    return <div style={{ height: 240, borderRadius: 16, backgroundColor: 'var(--bg-muted)', animation: 'pulse 1.5s infinite' }} />;
  }
  if (rows.length === 0) {
    return (
      <div style={{
        height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-tertiary)', fontSize: 14,
        border: '1px solid var(--border-light)', borderRadius: 16,
      }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 44)}>
      <BarChart layout="vertical" data={rows} margin={{ top: 0, right: 56, bottom: 0, left: 8 }} barCategoryGap={10}>
        <XAxis type="number" hide domain={[0, maxValue * 1.08]} />
        <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 13 }} />
        <Tooltip cursor={{ fill: 'var(--bg-muted)', opacity: 0.5 }} content={<ChartTooltip fmt={tooltipLine ?? ((d) => formatValue(d.value))} />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.label} fill={r.value === maxValue ? 'var(--color-info)' : 'var(--text-tertiary)'} />
          ))}
          <LabelList dataKey="value" position="right" formatter={(v: number) => formatValue(v)} style={{ fill: 'var(--text-secondary)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default StageBarChart;
