import React, { useState } from 'react';
import { useOpportunities, useCreateOpportunity, useUpdateOpportunity, useDeleteOpportunity, useUpdateOpportunityStageMutation, useCloseOpportunity } from '../../hooks/useCrmApi';
import { useOpportunityTypes } from '../../hooks/useOpportunityTypes';
import { Modal } from '../../components/Modal';
import { DataTable, Column } from '../../components/DataTable';
import { KanbanBoard } from '../../components/KanbanBoard';
import { FilterSidebar, FilterSelect, FilterDateRange, FilterSlider } from '../../components/FilterSidebar';
import { Opportunity, OpportunityStage, OpportunityHealth } from '../../types/crm';
import { formatINR, formatDate, healthColor, debounce } from '../../utils/crm';
import { Plus, Edit2, Trash2, Search, Filter, LayoutGrid, List as ListIcon, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

const oppSchema = z.object({
  name: z.string().min(1, 'Name required'),
  companyId: z.string().min(1, 'Company required'),
  stage: z.enum(['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']),
  value: z.number().min(0, 'Value must be positive'),
  expectedCloseValue: z.number().min(0),
  closeDate: z.string().min(1, 'Close date required'),
  ownerId: z.string().min(1, 'Owner required'),
  opportunityTypeId: z.string().optional(),
  customOpportunityType: z.string().optional(),
  description: z.string().optional(),
}).superRefine((val, ctx) => {
  // We'll validate the 'Other' logic in the component since we need access to the types list,
  // or we can just let backend validate it for now to keep schema clean.
});

type OppForm = z.infer<typeof oppSchema>;

const closeSchema = z.object({
  outcome: z.enum(['Won', 'Lost']),
  actualCloseDate: z.string(),
  actualCloseValue: z.number().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

type CloseForm = z.infer<typeof closeSchema>;

const stages: OpportunityStage[] = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

export function OpportunitiesPage(props: { tenantId?: string }) {
  const tenantId = props.tenantId || localStorage.getItem('tenantId') || '';
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [isNewOppOpen, setIsNewOppOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [closingOpp, setClosingOpp] = useState<Opportunity | null>(null);
  const [detailOpp, setDetailOpp] = useState<Opportunity | null>(null);

  const { data: oppsData, isLoading, error } = useOpportunities(tenantId, { ...filters, searchQuery }, view === 'list' ? { page, pageSize: 20 } : undefined);
  const createMut = useCreateOpportunity();
  const updateMut = useUpdateOpportunity();
  const deleteMut = useDeleteOpportunity();
  const stageMut = useUpdateOpportunityStageMutation();
  const closeMut = useCloseOpportunity();
  
  const { data: oppTypes } = useOpportunityTypes(tenantId);
  const activeOppTypes = oppTypes?.filter(t => t.isActive) || [];

  const formMethods = useForm<OppForm>({ resolver: zodResolver(oppSchema) });
  const closeMethods = useForm<CloseForm>({ resolver: zodResolver(closeSchema) });

  const opps = oppsData?.data || [];
  const totalOpps = oppsData?.total || 0;

  const handleSearchChange = debounce((q: string) => {
    setSearchQuery(q);
    setPage(1);
  }, 300);

  const handleCardMove = async (cardId: string, fromStage: string, toStage: string) => {
    try {
      await stageMut.mutateAsync({ id: cardId, stage: toStage });
      toast.success('Stage updated');
    } catch (err) {
      toast.error('Failed to update stage');
    }
  };

  const onSubmitOpp = async (data: OppForm) => {
    try {
      if (editingOpp) {
        await updateMut.mutateAsync({ id: editingOpp.id, ...data });
        toast.success('Opportunity updated');
      } else {
        await createMut.mutateAsync({ tenantId, ...data });
        toast.success('Opportunity created');
      }
      setIsNewOppOpen(false);
      setEditingOpp(null);
      formMethods.reset();
    } catch (err) {
      toast.error('Failed to save opportunity');
    }
  };

  const onSubmitClose = async (data: CloseForm) => {
    if (!closingOpp) return;
    try {
      await closeMut.mutateAsync({ id: closingOpp.id, ...data });
      toast.success('Opportunity closed');
      setClosingOpp(null);
      closeMethods.reset();
    } catch (err) {
      toast.error('Failed to close opportunity');
    }
  };

  const kanbanColumns = stages.map((stage) => ({
    id: stage,
    title: stage,
    count: opps.filter((o: Opportunity) => o.stage === stage).length,
  }));

  const kanbanCards = opps.map((opp: Opportunity) => ({
    id: opp.id,
    title: opp.name,
    subtitle: opp.companyName,
    value: formatINR(opp.value),
    health: opp.health,
    stage: opp.stage,
  }));

  const columns: Column<Opportunity>[] = [
    {
      key: 'name',
      label: 'Opportunity',
      sortable: true,
      render: (val, opp) => (
        <div className="flex flex-col">
          <span className="font-medium text-blue-400">{val}</span>
          {opp.opportunityType ? (
            <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">{opp.opportunityType.isDefault && opp.opportunityType.name === 'Other' && opp.customOpportunityType ? opp.customOpportunityType : opp.opportunityType.name}</span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-500/20 text-gray-400 rounded w-max mt-1">Uncategorized</span>
          )}
        </div>
      ),
    },
    { key: 'companyName', label: 'Company', sortable: true },
    {
      key: 'stage',
      label: 'Stage',
      render: (val: OpportunityStage) => (
        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">{val}</span>
      ),
    },
    {
      key: 'value',
      label: 'Value (₹)',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-semibold text-green-400">{formatINR(val)}</span>,
    },
    {
      key: 'closeDate',
      label: 'Close Date',
      sortable: true,
      render: (val) => formatDate(val),
    },
    {
      key: 'health',
      label: 'Health',
      render: (val: OpportunityHealth) => (
        <span className={`text-xs px-2 py-1 rounded text-white ${val === 'On-track' ? 'bg-green-500/20' : val === 'At-risk' ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
          {val}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      {/* Header */}
      <div className="bg-[#1a1a2e] border-b border-[#16213e] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Opportunities</h1>
            <p className="text-gray-400">{totalOpps} opportunities</p>
          </div>
          <button
            onClick={() => {
              setEditingOpp(null);
              formMethods.reset();
              setIsNewOppOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            New Opportunity
          </button>
        </div>

        {/* View toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              view === 'kanban' ? 'bg-blue-600 text-white' : 'bg-[#16213e] text-gray-300 hover:text-white'
            }`}
          >
            <LayoutGrid size={18} />
            Kanban
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              view === 'list' ? 'bg-blue-600 text-white' : 'bg-[#16213e] text-gray-300 hover:text-white'
            }`}
          >
            <ListIcon size={18} />
            List
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-200px)]">
        {/* Filter sidebar */}
        <FilterSidebar
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={() => setFilterOpen(false)}
          onReset={() => setFilters({})}
        >
          <FilterSelect
            label="Stage"
            value={filters.stage?.[0] || ''}
            options={stages.map((s) => ({ value: s, label: s }))}
            onChange={(val) => setFilters({ ...filters, stage: [val] })}
          />
          <FilterSelect
            label="Health"
            value={filters.health || ''}
            options={[
              { value: 'On-track', label: 'On-track' },
              { value: 'At-risk', label: 'At-risk' },
              { value: 'Lost', label: 'Lost' },
            ]}
            onChange={(val) => setFilters({ ...filters, health: val })}
          />
          <FilterDateRange
            label="Close Date"
            startDate={filters.dateRange?.[0] || ''}
            endDate={filters.dateRange?.[1] || new Date().toISOString().split('T')[0]}
            onStartDateChange={(d) => setFilters({ ...filters, dateRange: [d, filters.dateRange?.[1] || ''] })}
            onEndDateChange={(d) => setFilters({ ...filters, dateRange: [filters.dateRange?.[0] || '', d] })}
          />
          <FilterSlider
            label="Value Range (₹)"
            min={0}
            max={5000000}
            step={100000}
            value={filters.valueRange || [0, 5000000]}
            onChange={(val) => setFilters({ ...filters, valueRange: val })}
            formatValue={formatINR}
          />
        </FilterSidebar>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Search bar */}
          <div className="mb-6 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search opportunities..."
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1a1a2e] border border-[#16213e] rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setFilterOpen(true)}
              className="md:hidden px-4 py-2 bg-[#1a1a2e] border border-[#16213e] rounded-lg text-white hover:border-blue-500/50"
            >
              <Filter size={18} />
            </button>
          </div>

          {error && <div className="text-red-400 mb-4">Error loading opportunities</div>}

          {/* Kanban view */}
          {view === 'kanban' && (
            <KanbanBoard
              columns={kanbanColumns}
              cards={kanbanCards}
              onCardMove={handleCardMove}
              onCardClick={(card) => {
                const opp = opps.find((o: Opportunity) => o.id === card.id);
                if (opp) setDetailOpp(opp);
              }}
            />
          )}

          {/* List view */}
          {view === 'list' && (
            <>
              <DataTable
                columns={columns}
                data={opps}
                rowKey="id"
                isLoading={isLoading}
                emptyMessage="No opportunities found"
                sortKey={sortKey}
                sortOrder={sortOrder}
                onSort={(key, order) => {
                  setSortKey(key);
                  setSortOrder(order);
                }}
                rowActions={(opp) => (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDetailOpp(opp)}
                      className="p-1 text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setClosingOpp(opp)}
                      className="p-1 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Delete this opportunity?')) {
                          await deleteMut.mutateAsync(opp.id);
                          toast.success('Opportunity deleted');
                        }
                      }}
                      className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              />

              {/* Pagination */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-[#1a1a2e] border border-[#16213e] rounded-lg text-white disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-gray-400">Page {page}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={opps.length < 20}
                  className="px-4 py-2 bg-[#1a1a2e] border border-[#16213e] rounded-lg text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New/Edit Opportunity Modal */}
      <Modal
        isOpen={isNewOppOpen}
        onClose={() => {
          setIsNewOppOpen(false);
          setEditingOpp(null);
          formMethods.reset();
        }}
        title={editingOpp ? 'Edit Opportunity' : 'New Opportunity'}
        size="md"
      >
        <form onSubmit={formMethods.handleSubmit(onSubmitOpp)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Name *</label>
            <input
              {...formMethods.register('name')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
              placeholder="Opportunity name"
            />
            {formMethods.formState.errors.name && (
              <p className="text-red-400 text-xs mt-1">{formMethods.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Company *</label>
            <input
              {...formMethods.register('companyId')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
              placeholder="Company ID or name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Opportunity Type</label>
            <select
              {...formMethods.register('opportunityTypeId')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
            >
              <option value="">Select a type (optional)</option>
              {activeOppTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {activeOppTypes.find(t => t.id === formMethods.watch('opportunityTypeId'))?.name === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-white mb-1">Specify Opportunity *</label>
              <input
                {...formMethods.register('customOpportunityType')}
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter opportunity type"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-1">Stage *</label>
            <select
              {...formMethods.register('stage')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
            >
              {stages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Value (₹) *</label>
              <input
                {...formMethods.register('value', { valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Expected Close Value (₹)</label>
              <input
                {...formMethods.register('expectedCloseValue', { valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Close Date *</label>
            <input
              {...formMethods.register('closeDate')}
              type="date"
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Owner *</label>
            <input
              {...formMethods.register('ownerId')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
              placeholder="Owner ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Description</label>
            <textarea
              {...formMethods.register('description')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white h-24 resize-none"
              placeholder="Add description..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingOpp ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsNewOppOpen(false);
                setEditingOpp(null);
                formMethods.reset();
              }}
              className="flex-1 px-4 py-2 bg-[#16213e] text-white rounded-lg hover:bg-[#16213e]/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Close Opportunity Modal */}
      <Modal
        isOpen={!!closingOpp}
        onClose={() => {
          setClosingOpp(null);
          closeMethods.reset();
        }}
        title="Close Opportunity"
        size="md"
      >
        {closingOpp && (
          <form onSubmit={closeMethods.handleSubmit(onSubmitClose)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Outcome</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="Won"
                    {...closeMethods.register('outcome')}
                    className="w-4 h-4 accent-green-600"
                  />
                  <span className="text-white">Won</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="Lost"
                    {...closeMethods.register('outcome')}
                    className="w-4 h-4 accent-red-600"
                  />
                  <span className="text-white">Lost</span>
                </label>
              </div>
            </div>

            {closeMethods.watch('outcome') === 'Won' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Actual Close Value (₹)</label>
                  <input
                    {...closeMethods.register('actualCloseValue', { valueAsNumber: true })}
                    type="number"
                    className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
                    defaultValue={closingOpp.value}
                  />
                </div>
              </>
            )}

            {closeMethods.watch('outcome') === 'Lost' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Reason</label>
                  <select
                    {...closeMethods.register('reason')}
                    className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
                  >
                    <option value="">Select reason...</option>
                    <option value="Budget">Budget</option>
                    <option value="Timeline">Timeline</option>
                    <option value="Competition">Competition</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-1">Close Date *</label>
              <input
                {...closeMethods.register('actualCloseDate')}
                type="date"
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Notes</label>
              <textarea
                {...closeMethods.register('notes')}
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white h-20 resize-none"
                placeholder="Add notes..."
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setClosingOpp(null);
                  closeMethods.reset();
                }}
                className="flex-1 px-4 py-2 bg-[#16213e] text-white rounded-lg hover:bg-[#16213e]/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailOpp}
        onClose={() => setDetailOpp(null)}
        title={detailOpp?.name || 'Opportunity'}
        size="lg"
      >
        {detailOpp && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Company</p>
                <p className="text-white font-medium">{detailOpp.companyName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Stage</p>
                <p className="text-white font-medium">{detailOpp.stage}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Value (₹)</p>
                <p className="text-green-400 font-semibold">{formatINR(detailOpp.value)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Close Date</p>
                <p className="text-white font-medium">{formatDate(detailOpp.closeDate)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400">Description</p>
              <p className="text-white">{detailOpp.description || 'No description'}</p>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  setDetailOpp(null);
                  setEditingOpp(detailOpp);
                  formMethods.reset({
                    name: detailOpp.name,
                    companyId: detailOpp.companyId,
                    stage: detailOpp.stage,
                    value: detailOpp.value,
                    expectedCloseValue: detailOpp.expectedCloseValue,
                    closeDate: detailOpp.closeDate.split('T')[0],
                    ownerId: detailOpp.ownerId,
                    description: detailOpp.description,
                    opportunityTypeId: detailOpp.opportunityTypeId || '',
                    customOpportunityType: detailOpp.customOpportunityType || '',
                  });
                  setIsNewOppOpen(true);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setClosingOpp(detailOpp)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => setDetailOpp(null)}
                className="flex-1 px-4 py-2 bg-[#16213e] text-white rounded-lg hover:bg-[#16213e]/80 transition-colors"
              >
                Close Modal
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
