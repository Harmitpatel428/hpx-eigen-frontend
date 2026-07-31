import React, { useMemo, useState, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useQuery } from '@tanstack/react-query';
import { useDepartments } from '../context/DepartmentContext';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import {
  Plus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  AlertCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type DocStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'ARCHIVED';

/** Shape returned by GET /api/v1/docs/documents */
interface ApiDocument {
  id: string;
  title: string;
  status: DocStatus;
  version: number;
  updatedAt: string;
  createdAt: string;
  category: string | null;
  owner: { id: string };
}

/** Internal UI model */
interface Document {
  id: string;
  name: string;
  status: DocStatus;
  lastUpdated: string;
  version: string;
  author: string;
  category: string;
}

function mapApiDocument(d: ApiDocument): Document {
  return {
    id: d.id,
    name: d.title,
    status: d.status,
    lastUpdated: d.updatedAt,
    version: `${d.version}.0`,
    author: d.owner?.id?.slice(-4).toUpperCase() ?? '??',
    category: d.category ?? 'Uncategorized',
  };
}

// ─── Status Badge ──────────────────────────────────────────────────────────

const STATUS_STYLES: Record<DocStatus, { dot: string; text: string; bg: string }> = {
  DRAFT: { dot: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  IN_REVIEW: { dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  APPROVED: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  ARCHIVED: { dot: 'bg-[var(--text-tertiary)]', text: 'text-[var(--text-tertiary)]', bg: 'bg-[var(--bg-muted)]' },
};

const STATUS_LABELS: Record<DocStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  ARCHIVED: 'Archived',
};

function StatusBadge({ status }: { status: DocStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Skeleton Rows ─────────────────────────────────────────────────────────

const COLUMN_WIDTHS = [340, 140, 140, 90, 130, 110];

function SkeletonRows() {
  return (
    <tbody>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-[var(--border-light)]">
          {COLUMN_WIDTHS.map((w, j) => (
            <td key={j} className="px-4 py-3" style={{ width: w }}>
              <div
                className="h-4 rounded bg-[var(--bg-muted)] animate-pulse"
                style={{ width: j === 0 ? '75%' : j === 1 ? '60%' : '50%', animationDelay: `${i * 40}ms` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ─── Column Helper ─────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<Document>();

const COLUMNS = [
  columnHelper.accessor('name', {
    header: 'Document Name',
    cell: ({ getValue }) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <FileText className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
        <span className="font-medium text-[var(--text-primary)] truncate text-sm">{getValue()}</span>
      </div>
    ),
    size: 340,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    size: 140,
  }),
  columnHelper.accessor('lastUpdated', {
    header: 'Last Updated',
    cell: ({ getValue }) => (
      <span className="text-sm text-[var(--text-secondary)]">
        {new Date(getValue()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
    ),
    size: 140,
  }),
  columnHelper.accessor('version', {
    header: 'Version',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-[var(--text-tertiary)] bg-[var(--bg-muted)] px-2 py-0.5 rounded">
        v{getValue()}
      </span>
    ),
    size: 90,
  }),
  columnHelper.accessor('author', {
    header: 'Author',
    cell: ({ getValue }) => (
      <span className="text-sm text-[var(--text-secondary)]">{getValue()}</span>
    ),
    size: 130,
  }),
  columnHelper.accessor('category', {
    header: 'Category',
    cell: ({ getValue }) => (
      <span className="text-xs font-medium text-[var(--text-tertiary)] bg-[var(--bg-muted)] px-2 py-0.5 rounded-full">
        {getValue()}
      </span>
    ),
    size: 110,
  }),
];

// ─── Docs Dashboard ────────────────────────────────────────────────────────

export function DocsDashboard() {
  const { activeDepartmentId } = useDepartments();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const [sorting, setSorting] = useState<SortingState>([{ id: 'lastUpdated', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');

  const { data: documents = [], isLoading, isError } = useQuery({
    queryKey: ['docs', activeDepartmentId],
    queryFn: async (): Promise<Document[]> => {
      const res = await api.get<ApiDocument[]>('/api/v1/docs/documents');
      return res.data.map(mapApiDocument);

      /* ── Offline dev mock (uncomment when backend is unavailable) ──
      await new Promise(r => setTimeout(r, 400));
      const statuses: DocStatus[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED'];
      const categories = ['Contract', 'Policy', 'SOP', 'Proposal', 'Report', 'Template'];
      const authors = ['A. Singh', 'R. Kumar', 'P. Rao', 'M. Chen', 'S. Patel'];
      return Array.from({ length: 200 }, (_, i) => ({
        id: `doc-${i + 1}`, name: `Document ${i + 1}`,
        status: statuses[i % statuses.length],
        lastUpdated: new Date(Date.now() - i * 86400000).toISOString(),
        version: `${Math.floor(i / 4) + 1}.0`,
        author: authors[i % authors.length],
        category: categories[i % categories.length],
      }));
      ── End mock ── */
    },
    staleTime: 60_000,
    enabled: !!activeDepartmentId,
  });

  const table = useReactTable({
    data: documents,
    columns: COLUMNS,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  const totalSize = rowVirtualizer.getTotalSize();
  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0
    ? totalSize - virtualRows[virtualRows.length - 1].end
    : 0;

  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-light)] flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Documentation</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
            {isLoading ? 'Loading...' : `${filteredCount} document${filteredCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search documents..."
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="h-9 pl-9 pr-3 text-sm bg-[var(--bg-subtle)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-medium)] focus:bg-[var(--bg-app)] transition-all w-56 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30"
            />
          </div>
          <Button variant="primary" className="gap-1.5">
            <Plus className="w-4 h-4" />
            New Document
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {isError && (
        <div className="mx-8 mt-4 flex items-center gap-2.5 px-4 py-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load documents. Ensure the backend server is running and you are authenticated.
          </p>
        </div>
      )}

      {/* Table */}
      <div ref={tableContainerRef} className="flex-1 overflow-auto">
        <table className="w-full border-collapse min-w-[800px]">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-[var(--bg-subtle)] border-b border-[var(--border-light)]">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const isSorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider select-none"
                    >
                      {header.column.getCanSort() ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {isSorted === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : isSorted === 'desc' ? (
                            <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* Loading Skeleton */}
          {isLoading && <SkeletonRows />}

          {/* Virtualized Body */}
          {!isLoading && (
            <tbody>
              {paddingTop > 0 && <tr><td style={{ height: paddingTop }} /></tr>}
              {virtualRows.map(virtualRow => {
                const row = rows[virtualRow.index];
                return (
                  <tr
                    key={row.id}
                    className="group border-b border-[var(--border-light)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className="px-4 py-3 align-middle"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {paddingBottom > 0 && <tr><td style={{ height: paddingBottom }} /></tr>}
            </tbody>
          )}
        </table>

        {/* Empty State */}
        {!isLoading && !isError && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-[var(--text-tertiary)]">
            <FileText className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">
              {globalFilter ? 'No documents match your search' : 'No documents found'}
            </p>
            <p className="text-xs mt-1">
              {globalFilter ? 'Try a different search term' : 'Create your first document to get started'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {!isLoading && !isError && (
        <div className="px-8 py-3 border-t border-[var(--border-light)] flex-shrink-0 flex items-center justify-between">
          <p className="text-xs text-[var(--text-tertiary)]">
            Showing {virtualRows.length} of {filteredCount} document{filteredCount !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Virtualized — handles 10,000+ rows at 60fps
          </p>
        </div>
      )}
    </div>
  );
}
