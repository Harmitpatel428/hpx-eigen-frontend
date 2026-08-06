import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ArrowRight, Circle, Clock, Mail, Phone, Calendar } from 'lucide-react';
import { opportunityService } from '../services/opportunity.service';
import { activityService } from '../services/activity.service';
import type { Opportunity, Activity } from '../types';

function formatCurrency(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

const KEYFRAMES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
`;

function anim(name: string, delay = 0, duration = 500): React.CSSProperties {
  return {
    animation: `${name} ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`,
  };
}

export function OverviewPage() {
  const { data: opportunities = [] } = useQuery<Opportunity[]>({
    queryKey: ['opportunities'],
    queryFn: () => opportunityService.findAll(),
  });
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['activities'],
    queryFn: () => activityService.findAll(),
  });

  const openOpps = opportunities.filter(o => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage));
  const pipelineValue = openOpps.reduce((sum, o) => sum + parseFloat(o.value || '0'), 0);

  const recentActivities = [...activities]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const STAGES = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION'];

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div className="max-w-7xl mx-auto">
        {/* Massive Editorial Greeting */}
        <div style={{ marginBottom: 'var(--space-24)', ...anim('fadeUp', 0, 600) }}>
          <h1 className="type-hero" style={{ marginBottom: 'var(--space-6)', maxWidth: 800 }}>
            Good morning. Your active pipeline is currently sitting at{' '}
            <span style={{ color: 'var(--color-success)' }}>{formatCurrency(pipelineValue)}</span>.
          </h1>

          <div style={{ display: 'flex', gap: 'var(--space-8)', ...anim('fadeUp', 120, 600) }}>
            <div>
              <div className="type-micro" style={{ marginBottom: 'var(--space-1)' }}>Win Rate</div>
              <div className="type-h2" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                64% <ArrowUpRight size={16} color="var(--color-success)" />
              </div>
            </div>
            <div>
              <div className="type-micro" style={{ marginBottom: 'var(--space-1)' }}>Active Deals</div>
              <div className="type-h2">{openOpps.length}</div>
            </div>
            <div>
              <div className="type-micro" style={{ marginBottom: 'var(--space-1)' }}>Avg Velocity</div>
              <div className="type-h2">18 days</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-16)' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>

            {/* Pipeline Momentum */}
            <div style={anim('fadeUp', 200, 600)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-6)' }}>
                <h2 className="type-title">Pipeline Momentum</h2>
                <button className="btn btn-ghost" style={{ padding: 0 }}>
                  View all <ArrowRight size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {STAGES.map((stage, i) => {
                  const oppsInStage = openOpps.filter(o => o.stage === stage);
                  const val = oppsInStage.reduce((sum, o) => sum + parseFloat(o.value || '0'), 0);
                  const pct = pipelineValue > 0 ? (val / pipelineValue) * 100 : 0;

                  return (
                    <div
                      key={stage}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-6)',
                        padding: 'var(--space-4) 0',
                        borderBottom: '1px solid var(--border-light)',
                        ...anim('slideInLeft', 280 + i * 60, 500),
                      }}
                    >
                      <div style={{ width: 140, flexShrink: 0 }}>
                        <div className="type-ui" style={{ color: 'var(--text-primary)' }}>
                          {stage.replace('_', ' ')}
                        </div>
                        <div className="type-micro" style={{ color: 'var(--text-tertiary)' }}>
                          {oppsInStage.length} deals
                        </div>
                      </div>

                      <div
                        style={{
                          flex: 1,
                          height: 4,
                          backgroundColor: 'var(--bg-muted)',
                          borderRadius: 'var(--radius-full)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            backgroundColor: 'var(--color-info)',
                            borderRadius: 'var(--radius-full)',
                            transition: `width 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${400 + i * 80}ms`,
                          }}
                        />
                      </div>

                      <div style={{ width: 100, textAlign: 'right', flexShrink: 0 }}>
                        <div className="type-ui" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatCurrency(val)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Today's Priorities */}
            <div style={anim('fadeUp', 560, 500)}>
              <h2 className="type-title" style={{ marginBottom: 'var(--space-6)' }}>Today's Priorities</h2>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="list-row" style={{ cursor: 'pointer', ...anim('fadeIn', 620, 400) }}>
                  <Circle size={16} className="text-tertiary" />
                  <div style={{ flex: 1 }}>
                    <div className="type-ui" style={{ color: 'var(--text-primary)' }}>
                      Send revised proposal to HPX EIGEN
                    </div>
                    <div className="type-micro" style={{ color: 'var(--color-warning)', marginTop: 2 }}>
                      High Priority &bull; Due Today
                    </div>
                  </div>
                  <div className="avatar">AC</div>
                </div>
                <div className="list-row" style={{ cursor: 'pointer', ...anim('fadeIn', 680, 400) }}>
                  <Circle size={16} className="text-tertiary" />
                  <div style={{ flex: 1 }}>
                    <div className="type-ui" style={{ color: 'var(--text-primary)' }}>
                      Follow up on initial qualification call
                    </div>
                    <div className="type-micro" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>
                      Globex Inc
                    </div>
                  </div>
                  <div className="avatar">GL</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Activity */}
          <div style={anim('slideInRight', 250, 600)}>
            <h3 className="type-h2" style={{ marginBottom: 'var(--space-8)' }}>Recent Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
              {recentActivities.map((act, i) => {
                const Icon =
                  act.type === 'CALL'    ? Phone    :
                  act.type === 'EMAIL'   ? Mail     :
                  act.type === 'MEETING' ? Calendar : Clock;
                return (
                  <div
                    key={act.id}
                    style={{ display: 'flex', gap: 'var(--space-4)', ...anim('fadeIn', 350 + i * 70, 400) }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--bg-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <Icon size={14} />
                    </div>
                    <div>
                      <div className="type-ui" style={{ color: 'var(--text-primary)', marginBottom: 2 }}>
                        {act.subject}
                      </div>
                      {act.notes && (
                        <div className="type-body" style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>
                          {act.notes}
                        </div>
                      )}
                      <div className="type-micro" style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(act.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {recentActivities.length === 0 && (
                <div className="type-body" style={{ color: 'var(--text-tertiary)', ...anim('fadeIn', 400, 400) }}>
                  No recent activity to display.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
