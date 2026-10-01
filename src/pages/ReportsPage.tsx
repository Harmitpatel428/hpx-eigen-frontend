import React from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { DataTable, type Column } from '../components/DataTable';
import { CaseFieldFilterBar } from '../components/reports/CaseFieldFilterBar';
import { useAuth } from '../auth/public';
import { useCaseFields, useCaseEngineSettings } from '../hooks/useCaseFields';
import { useCaseList, useCasesByOption, useOnTimeVsLate, useOverdueByStage } from '../hooks/useCaseReports';
import { exportCSV } from '../utils/csv';
import { extractApiError } from '../utils/extractApiError';
import type { CaseFieldFilter } from '../services/documentation.service';
import type { DocCase } from '../types';

const EXPORT_CAP = 5000;
const SORTABLE = ['createdAt', 'priority', 'completionPercent', 'targetDate'];

const columns: Column<DocCase>[] = [
  { key: 'caseNumber', label: 'Case #' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'completionPercent', label: 'Completion %', sortable: true },
  { key: 'createdAt', label: 'Created', sortable: true },
];

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded border border-slate-200 bg-white" style={{ padding: 'var(--space-6)' }}>
    <h2 className="text-sm font-semibold text-slate-700" style={{ marginBottom: 'var(--space-3)' }}>{title}</h2>
    {children}
  </section>
);

export const ReportsPage: React.FC = () => {
  const { permissions } = useAuth();
  const { data: engineSettings, isLoading: engineLoading } = useCaseEngineSettings();
  const canSla = permissions.can('case-timeline:view');
  const overdue = useOverdueByStage(canSla);
  const onTime = useOnTimeVsLate(canSla);
  const { data: fields = [] } = useCaseFields();
  const [reportFieldId, setReportFieldId] = React.useState<string | null>(null);
  const byOption = useCasesByOption(reportFieldId);
  const [filters, setFilters] = React.useState<CaseFieldFilter[]>([]);
  const [sort, setSort] = React.useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });
  const list = useCaseList({ pageSize: 100, fieldFilters: filters, sortBy: sort.key, sortDir: sort.order });

  // Surface backend 400/404s (bad filter, non-reportable field) as toasts.
  React.useEffect(() => {
    [overdue.error, onTime.error, byOption.error, list.error]
      .filter(Boolean)
      .forEach((e) => toast.error(extractApiError(e).message));
  }, [overdue.error, onTime.error, byOption.error, list.error]);

  const rows = list.data?.data ?? [];
  const reportable = fields.filter((f) => f.reportable && f.type === 'SELECT');

  const doExport = () =>
    exportCSV('cases', columns.map((c) => String(c.key)),
      rows.slice(0, EXPORT_CAP) as unknown as Record<string, unknown>[]);

  // Engine-disabled tenant: hide the surface (matches the nav gate) — backend fail-closes anyway.
  if (!engineLoading && engineSettings && !engineSettings.caseOperationsEngineEnabled) {
    return <Navigate to="/overview" replace />;
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="type-title" style={{ marginBottom: 'var(--space-2)' }}>Reports</h1>
        <p className="type-body" style={{ color: 'var(--text-secondary)' }}>Operational reports and a filterable case list.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {canSla && <Card title="Overdue / at-risk by stage">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500"><th className="text-left font-semibold" style={{ padding: 'var(--space-2) var(--space-3)' }}>Stage</th><th className="text-right font-semibold" style={{ padding: 'var(--space-2) var(--space-3)' }}>Overdue</th><th className="text-right font-semibold" style={{ padding: 'var(--space-2) var(--space-3)' }}>At risk</th></tr></thead>
            <tbody>
              {(overdue.data ?? []).map((r) => (
                <tr key={r.stageKey} className="transition-colors hover:bg-[var(--bg-subtle)]"><td style={{ padding: 'var(--space-2) var(--space-3)' }}>{r.stageKey}</td><td className="text-right tabular-nums" style={{ padding: 'var(--space-2) var(--space-3)' }}>{r.overdue}</td><td className="text-right tabular-nums" style={{ padding: 'var(--space-2) var(--space-3)' }}>{r.atRisk}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>}
        {canSla && <Card title="On time vs late">
          <p className="text-sm flex justify-between" style={{ padding: 'var(--space-2) 0' }}><span>On time:</span> <b className="tabular-nums">{onTime.data?.onTime ?? '-'}</b></p>
          <p className="text-sm flex justify-between" style={{ padding: 'var(--space-2) 0' }}><span>Late:</span> <b className="tabular-nums">{onTime.data?.late ?? '-'}</b></p>
        </Card>}
        <Card title="Cases by option">
          <select aria-label="Report field" className="mb-2 rounded border border-slate-300 px-2 py-1 text-sm"
            value={reportFieldId ?? ''} onChange={(e) => setReportFieldId(e.target.value || null)}>
            <option value="">Select field...</option>
            {reportable.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <ul className="text-sm">
            {(byOption.data ?? []).map((r) => <li key={r.optionId}>{r.label}: <b>{r.count}</b></li>)}
          </ul>
        </Card>
      </div>
      <Card title="Cases">
        <div className="mb-3 flex items-start justify-between gap-4">
          <CaseFieldFilterBar value={filters} onChange={setFilters} />
          <button className="btn btn-ghost" type="button" onClick={doExport}>
            <Download size={14} /> Export CSV
          </button>
        </div>
        <DataTable<DocCase>
          columns={columns} data={rows} rowKey="id" isLoading={list.isLoading}
          sortKey={sort.key} sortOrder={sort.order}
          onSort={(key, order) => { if (SORTABLE.includes(key)) setSort({ key, order }); }}
          emptyMessage="No cases match"
        />
      </Card>
    </div>
  );
};
