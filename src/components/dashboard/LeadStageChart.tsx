import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { leadService } from '../../services/lead.service';
import { SELECTABLE_STAGES, LEAD_STAGE_LABELS } from '../../domain/leadStage';
import { StageBarChart } from './StageBarChart';

export const LeadStageChart: React.FC = () => {
  const { data: counts, isLoading } = useQuery({
    queryKey: ['leads', 'stage-counts', 'overview'],
    queryFn: () => leadService.stageCounts(),
    staleTime: 60_000,
  });

  const data = SELECTABLE_STAGES.map((key) => ({ label: LEAD_STAGE_LABELS[key], value: counts?.[key] ?? 0 }));
  const total = data.reduce((s, r) => s + r.value, 0);

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
      <StageBarChart
        data={data}
        isLoading={isLoading}
        emptyMessage="No leads yet"
        tooltipLine={(d) => `${d.value} ${d.value === 1 ? 'lead' : 'leads'}`}
      />
    </div>
  );
};

export default LeadStageChart;
