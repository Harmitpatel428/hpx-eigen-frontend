import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { KpiCard } from './KpiCard';
import type { DocumentationMetrics } from '../../hooks/useDashboardMetrics';
import { normaliseCaseIdInput, isValidCaseId } from '../../domain/caseId';

const KEYFRAMES = `
  @keyframes dd-fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

function anim(delay = 0, duration = 600): React.CSSProperties {
  return {
    animation: `dd-fadeUp ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`,
  };
}

export const DocumentationDashboard: React.FC = () => {
  const { data: metrics, isLoading, error } = useDashboardMetrics<DocumentationMetrics>();

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

      <div className="space-y-8">
        {/* Hero — July 22 editorial style */}
        <div style={anim(0)}>
          <h1 className="type-hero" style={{ marginBottom: 'var(--space-6)', maxWidth: 800 }}>
            Documentation center.{' '}
            <span style={{ color: 'var(--color-warning)' }}>
              {metrics.activeDrafts} drafts
            </span>{' '}
            awaiting review.
          </h1>

          <div style={{ display: 'flex', gap: 'var(--space-8)', ...anim(100, 500) }}>
            <div>
              <div className="type-micro" style={{ marginBottom: 'var(--space-1)' }}>Compliance Rate</div>
              <div className="type-h2">{metrics.complianceRate}%</div>
            </div>
            <div>
              <div className="type-micro" style={{ marginBottom: 'var(--space-1)' }}>Review Turnaround</div>
              <div className="type-h2">{metrics.reviewTurnaround} {metrics.unit}</div>
            </div>
            <div>
              <div className="type-micro" style={{ marginBottom: 'var(--space-1)' }}>Pending Signatures</div>
              <div className="type-h2">{metrics.pendingSignatures}</div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Active Drafts',      value: metrics.activeDrafts,                                 subtitle: 'In progress',     accent: 'amber'   as const },
            { title: 'Review Turnaround',  value: `${metrics.reviewTurnaround} ${metrics.unit}`,        trend: 'down' as const, trendValue: '-3 hrs', accent: 'amber'   as const },
            { title: 'Compliance Rate',    value: `${metrics.complianceRate}%`,                          trend: 'up'   as const, trendValue: '+2%',    accent: 'emerald' as const },
            { title: 'Pending Signatures', value: metrics.pendingSignatures,                             subtitle: 'Awaiting client', accent: 'rose'    as const },
          ].map((card, i) => (
            <div key={card.title} style={anim(220 + i * 60)}>
              <KpiCard {...card} />
            </div>
          ))}
        </div>

        {/* Client Portal entry card */}
        <div style={anim(500)}>
          <ClientPortalCard />
        </div>
      </div>
    </>
  );
};

// ── Client Portal entry card (Screen D) ──────────────────────────────────────

function ClientPortalCard() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const isValid = isValidCaseId(value);

  const handleChange = (raw: string) => {
    setValue(normaliseCaseIdInput(raw));
  };

  const handleSubmit = () => {
    if (!isValid) return;
    navigate(`/client-portal?id=${value}`);
  };

  return (
    <div style={{
      borderRadius: 24, background: 'var(--bg-subtle)',
      padding: '28px 28px 24px',
      border: '1px solid #F3F4F6',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'rgba(124,58,237,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Client Portal
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Check a case status by entering a Case ID. Clients use the same portal to track their application.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="HPX-••••-••••"
          style={{
            flex: 1, height: 36, borderRadius: 10, paddingInline: 12,
            border: '1px solid var(--border-medium)', background: 'var(--bg-app)',
            outline: 'none', fontSize: 13, fontWeight: 600,
            fontFamily: 'ui-monospace, "Cascadia Code", Menlo, monospace',
            letterSpacing: '0.06em', color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          style={{
            height: 36, borderRadius: 10, paddingInline: 16,
            background: isValid ? '#111827' : 'var(--bg-subtle)',
            color: isValid ? '#fff' : 'var(--text-tertiary)',
            border: isValid ? 'none' : '1px solid var(--border-medium)',
            fontSize: 12, fontWeight: 700, cursor: isValid ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap', transition: 'all 0.15s',
          }}
        >
          Enter Case ID
        </button>
      </div>
    </div>
  );
}

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-8">
    <div className="h-32 animate-pulse rounded-3xl bg-gray-100" />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-3xl bg-gray-100" />
      ))}
    </div>
  </div>
);

export default DocumentationDashboard;
