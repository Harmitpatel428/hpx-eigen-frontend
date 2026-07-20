import { useQuery } from '@tanstack/react-query';
import { Target, Trophy, Filter, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import type { Opportunity } from '../types';
import { opportunityService } from '../services/opportunity.service';

const STAGES = ['PROSPECTING','QUALIFICATION','PROPOSAL','NEGOTIATION','CLOSED_WON'];
const STAGE_LABELS: Record<string,string> = {
  PROSPECTING:'Prospecting', QUALIFICATION:'Qualified',
  PROPOSAL:'Proposal', NEGOTIATION:'Negotiation', CLOSED_WON:'Won',
};

function formatCurrency(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function avgDaysInStage(opps: Opportunity[], stage: string): string {
  const relevant = opps.filter(o => o.stage === stage && o.createdAt);
  if (!relevant.length) return '—';
  const avgMs = relevant.reduce((s, o) => s + (Date.now() - new Date(o.createdAt).getTime()), 0) / relevant.length;
  return `${Math.round(avgMs / 86_400_000)}d`;
}

export function PipelineAnalyticsPage() {
  const { data: opportunities = [], isLoading } = useQuery<Opportunity[]>({
    queryKey: ['opportunities'],
    queryFn: () => opportunityService.findAll(),
  });

  const wonDeals    = opportunities.filter(o => o.stage === 'CLOSED_WON');
  const lostDeals   = opportunities.filter(o => o.stage === 'CLOSED_LOST');
  const openDeals   = opportunities.filter(o => !['CLOSED_WON','CLOSED_LOST'].includes(o.stage));
  
  const winRate = (wonDeals.length + lostDeals.length) > 0
    ? Math.round(wonDeals.length / (wonDeals.length + lostDeals.length) * 100)
    : 0;
    
  const totalPipeline = openDeals.reduce((s, o) => s + parseFloat(o.value||'0'), 0);
  const wonValue      = wonDeals.reduce((s, o) => s + parseFloat(o.value||'0'), 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="type-title">Analytics</h1>
          <p className="type-body">Performance and Forecasting</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary">
            <Filter size={16} /> Filters
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Compiling data...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
          
          {/* Top Level Metrics (Massive Typography) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-8)' }}>
            <div>
              <div className="type-ui" style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Target size={14} /> Open Pipeline
              </div>
              <div className="type-hero">{formatCurrency(totalPipeline)}</div>
              <div className="type-micro" style={{ color: 'var(--color-success)', marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <ArrowUpRight size={12} /> +12.4% vs last month
              </div>
            </div>
            
            <div>
              <div className="type-ui" style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Trophy size={14} /> Revenue Won
              </div>
              <div className="type-hero">{formatCurrency(wonValue)}</div>
              <div className="type-micro" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <ArrowDownRight size={12} /> -2.1% vs last month
              </div>
            </div>
            
            <div>
              <div className="type-ui" style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Activity size={14} /> Win Rate
              </div>
              <div className="type-hero">{winRate}%</div>
              <div className="type-micro" style={{ color: 'var(--color-success)', marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <ArrowUpRight size={12} /> +5.0% vs last month
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)' }} />

          {/* Velocity Breakdown */}
          <div>
            <h2 className="type-h2" style={{ marginBottom: 'var(--space-8)' }}>Stage Velocity Breakdown</h2>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {STAGES.map((stage, idx) => {
                const count = opportunities.filter(o => o.stage === stage).length;
                const val   = opportunities.filter(o => o.stage === stage).reduce((s,o) => s + parseFloat(o.value||'0'), 0);
                return (
                  <div key={stage} className="surface" style={{ flex: 1, padding: 'var(--space-6)', display: 'flex', flexDirection: 'column' }}>
                    <div className="type-micro" style={{ marginBottom: 'var(--space-6)', color: 'var(--text-secondary)' }}>{idx + 1}. {STAGE_LABELS[stage]}</div>
                    <div className="type-h1" style={{ marginBottom: 'var(--space-1)' }}>{avgDaysInStage(opportunities, stage)}</div>
                    <div className="type-ui" style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-8)' }}>Avg. duration</div>
                    
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: 'var(--space-4)' }}>
                      <div>
                        <div className="type-h2" style={{ fontSize: 16 }}>{count}</div>
                        <div className="type-micro" style={{ color: 'var(--text-tertiary)' }}>Deals</div>
                      </div>
                      <div className="type-ui" style={{ fontWeight: 600 }}>
                        {formatCurrency(val)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
