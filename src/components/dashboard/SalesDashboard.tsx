import React from 'react';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { KpiCard } from './KpiCard';
import { formatCurrency } from '../../utils/crm';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import type { SalesMetrics } from '../../hooks/useDashboardMetrics';

const KEYFRAMES = `
  @keyframes sd-fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

function anim(delay = 0, duration = 600): React.CSSProperties {
  return {
    animation: `sd-fadeUp ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`,
  };
}

function fmtCompact(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000)    return `₹${(value / 100_000).toFixed(1)}L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

const PIPELINE_STAGES = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION'] as const;

export const SalesDashboard: React.FC = () => {
  const { data: metrics, isLoading, error } = useDashboardMetrics<SalesMetrics>();

  // Per-stage pipeline comes from the metrics endpoint — no full opportunity fetch
  const stageMap = new Map((metrics?.pipelineByStage ?? []).map(s => [s.stage, s]));
  const totalPipelineVal = metrics?.pipelineValue ?? 0;

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="rounded-3xl bg-rose-50 p-6 text-rose-700">
        <p className="font-medium">Failed to load dashboard</p>
        <p className="text-sm opacity-80">{error.message}</p>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div>
        {/* ── Hero ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 'var(--space-24)', ...anim(0) }}>
          <h1 className="type-hero" style={{ marginBottom: 'var(--space-6)', maxWidth: 800 }}>
            Good morning. Your active pipeline is currently sitting at{' '}
            <span style={{ color: 'var(--color-success)' }}>
              {formatCurrency(metrics.pipelineValue, metrics.currency)}
            </span>
            .
          </h1>

          <div style={{ display: 'flex', gap: 'var(--space-8)', ...anim(100, 500) }}>
            <div>
              <div className="type-micro" style={{ marginBottom: 'var(--space-1)' }}>Win Rate</div>
              <div className="type-h2" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {metrics.winRate}%
                <ArrowUpRight size={16} color="var(--color-success)" />
              </div>
            </div>
            <div>
              <div className="type-micro" style={{ marginBottom: 'var(--space-1)' }}>Active Deals</div>
              <div className="type-h2">{metrics.activeDeals}</div>
            </div>
            <div>
              <div className="type-micro" style={{ marginBottom: 'var(--space-1)' }}>Avg Velocity</div>
              <div className="type-h2">{metrics.avgVelocity} days</div>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" style={{ marginBottom: 'var(--space-16)', ...anim(200) }}>
          {([
            { title: 'Win Rate',       value: `${metrics.winRate}%`,                                   trend: 'up'   as const, trendValue: '+4%',     accent: 'emerald' as const },
            { title: 'Active Deals',   value: metrics.activeDeals,                                     subtitle: 'In pipeline' },
            { title: 'Avg Velocity',   value: `${metrics.avgVelocity} days`,                           trend: 'down' as const, trendValue: '-2 days', accent: 'emerald' as const },
            { title: 'Pipeline Value', value: formatCurrency(metrics.pipelineValue, metrics.currency), trend: 'up'   as const, trendValue: '+12%',    accent: 'emerald' as const },
          ] as const).map((card, i) => (
            <div key={card.title} style={anim(220 + i * 60)}>
              <KpiCard {...(card as any)} />
            </div>
          ))}
        </div>

        {/* ── Pipeline Momentum ─────────────────────────────────── */}
        <div style={anim(480)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-6)' }}>
            <h2 className="type-title">Pipeline Momentum</h2>
            <button className="btn btn-ghost" style={{ padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              View all <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {PIPELINE_STAGES.map((stage, i) => {
              const entry = stageMap.get(stage);
              const deals = entry?.count ?? 0;
              const val   = entry?.value ?? 0;
              const pct   = totalPipelineVal > 0 ? (val / totalPipelineVal) * 100 : 0;

              return (
                <div
                  key={stage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-6)',
                    padding: 'var(--space-4) 0',
                    borderBottom: '1px solid var(--border-light)',
                    ...anim(540 + i * 60, 500),
                  }}
                >
                  {/* Stage label */}
                  <div style={{ width: 150, flexShrink: 0 }}>
                    <div className="type-ui" style={{ color: 'var(--text-primary)' }}>
                      {stage.replace('_', ' ')}
                    </div>
                    <div className="type-micro" style={{ color: 'var(--text-tertiary)' }}>
                      {deals} {deals === 1 ? 'deal' : 'deals'}
                    </div>
                  </div>

                  {/* Animated bar */}
                  <div style={{ flex: 1, height: 4, backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: 'var(--color-info)',
                        borderRadius: 'var(--radius-full)',
                        transition: `width 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${600 + i * 80}ms`,
                      }}
                    />
                  </div>

                  {/* Value */}
                  <div style={{ width: 90, textAlign: 'right', flexShrink: 0 }}>
                    <div className="type-ui" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {fmtCompact(val)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-8">
    <div className="h-36 animate-pulse rounded-3xl bg-gray-100" />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-3xl bg-gray-100" />
      ))}
    </div>
    <div className="h-48 animate-pulse rounded-3xl bg-gray-100" />
  </div>
);

export default SalesDashboard;
