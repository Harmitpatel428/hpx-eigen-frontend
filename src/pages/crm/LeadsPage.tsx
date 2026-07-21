import React, { useState } from 'react';
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, useConvertLeadToOpportunity } from '../../hooks/useCrmApi';
import { Modal } from '../../components/Modal';
import { DataTable, Column } from '../../components/DataTable';
import { FilterSidebar, FilterSelect, FilterDateRange, FilterSlider, FilterCheckbox } from '../../components/FilterSidebar';
import { Lead, LeadStatus, LeadSource } from '../../types/crm';
import { formatINR, formatDate, isValidEmail, isValidPhone, debounce } from '../../utils/crm';
import { Menu, Plus, Edit2, Trash2, ArrowRight, Search, Filter } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

const leadSchema = z.object({
  fullName: z.string().min(1, 'Full name required'),
  companyName: z.string().min(1, 'Company name required'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  source: z.enum(['Website', 'Referral', 'Email', 'Event', 'Cold Call']),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Disqualified', 'Converted']),
  expectedValue: z.number().min(0, 'Value must be positive'),
  notes: z.string().optional(),
});

type LeadForm = z.infer<typeof leadSchema>;

const oppSchema = z.object({
  opportunityName: z.string().min(1, 'Opp name required'),
  stage: z.string().default('PROSPECTING'),
  value: z.number().min(0),
  closeDate: z.string().min(1, 'Close date required'),
});

type ConvertForm = z.infer<typeof oppSchema>;

export function LeadsPage({ tenantId }: { tenantId: string }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  const { data: leadsData, isLoading, error } = useLeads(tenantId, { ...filters, searchQuery }, { page, pageSize: 20 });
  const createMut = useCreateLead();
  const updateMut = useUpdateLead();
  const deleteMut = useDeleteLead();
  const convertMut = useConvertLeadToOpportunity();

  const formMethods = useForm<LeadForm>({ resolver: zodResolver(leadSchema) });
  const convertMethods = useForm<ConvertForm>({ resolver: zodResolver(oppSchema) as any });

  const leads = leadsData?.data || [];
  const totalLeads = leadsData?.total || 0;

  const handleSearchChange = debounce((q: string) => {
    setSearchQuery(q);
    setPage(1);
  }, 300);

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    setSortKey(key);
    setSortOrder(order);
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    formMethods.reset({
      fullName: lead.fullName,
      companyName: lead.companyName,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      expectedValue: lead.expectedValue,
      notes: lead.notes,
    });
    setIsNewLeadOpen(true);
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm('Delete this lead?')) {
      await deleteMut.mutateAsync(id);
      toast.success('Lead deleted');
    }
  };

  const onSubmitLead = async (data: LeadForm) => {
    try {
      if (editingLead) {
        await updateMut.mutateAsync({ id: editingLead.id, ...data });
        toast.success('Lead updated');
      } else {
        await createMut.mutateAsync({ tenantId, ...data });
        toast.success('Lead created');
      }
      setIsNewLeadOpen(false);
      formMethods.reset();
      setEditingLead(null);
    } catch (err) {
      toast.error('Failed to save lead');
    }
  };

  const onSubmitConvert = async (data: ConvertForm) => {
    if (!convertingLead) return;
    try {
      await convertMut.mutateAsync({ leadId: convertingLead.id, ...data });
      toast.success('Lead converted to opportunity');
      setConvertingLead(null);
      convertMethods.reset();
    } catch (err) {
      toast.error('Failed to convert lead');
    }
  };

  const columns: Column<Lead>[] = [
    {
      key: 'fullName',
      label: 'Lead Name',
      sortable: true,
      render: (val) => <span className="font-medium text-blue-400">{val}</span>,
    },
    { key: 'companyName', label: 'Company', sortable: true },
    { key: 'source', label: 'Source', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (val: LeadStatus) => (
        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">{val}</span>
      ),
    },
    {
      key: 'expectedValue',
      label: 'Value (₹)',
      sortable: true,
      render: (val) => <span className="font-semibold text-green-400">{formatINR(val)}</span>,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (val) => formatDate(val),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      {/* Header */}
      <div className="bg-[#1a1a2e] border-b border-[#16213e] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Leads</h1>
            <p className="text-gray-400">{totalLeads} leads</p>
          </div>
          <button
            onClick={() => {
              setEditingLead(null);
              formMethods.reset();
              setIsNewLeadOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            New Lead
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-140px)]">
        {/* Filter sidebar */}
        <FilterSidebar
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={() => setFilterOpen(false)}
          onReset={() => setFilters({})}
          title="Filters"
        >
          <FilterSelect
            label="Status"
            value={filters.status?.[0] || ''}
            options={[
              { value: 'New', label: 'New' },
              { value: 'Contacted', label: 'Contacted' },
              { value: 'Qualified', label: 'Qualified' },
              { value: 'Disqualified', label: 'Disqualified' },
              { value: 'Converted', label: 'Converted' },
            ]}
            onChange={(val) => setFilters({ ...filters, status: [val] })}
          />
          <FilterSelect
            label="Source"
            value={filters.source?.[0] || ''}
            options={[
              { value: 'Website', label: 'Website' },
              { value: 'Referral', label: 'Referral' },
              { value: 'Email', label: 'Email' },
              { value: 'Event', label: 'Event' },
              { value: 'Cold Call', label: 'Cold Call' },
            ]}
            onChange={(val) => setFilters({ ...filters, source: [val] })}
          />
          <FilterDateRange
            label="Created Date"
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
                placeholder="Search by name or company..."
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

          {/* Table */}
          {error && <div className="text-red-400 mb-4">Error loading leads</div>}
          <DataTable
            columns={columns}
            data={leads}
            rowKey="id"
            isLoading={isLoading}
            emptyMessage="No leads found"
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            rowActions={(lead) => (
              <div className="flex gap-2">
                <button
                  onClick={() => setConvertingLead(lead)}
                  className="p-1 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                  title="Convert to opportunity"
                >
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => handleEditLead(lead)}
                  className="p-1 text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDeleteLead(lead.id)}
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
              disabled={leads.length < 20}
              className="px-4 py-2 bg-[#1a1a2e] border border-[#16213e] rounded-lg text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* New/Edit Lead Modal */}
      <Modal
        isOpen={isNewLeadOpen}
        onClose={() => {
          setIsNewLeadOpen(false);
          setEditingLead(null);
          formMethods.reset();
        }}
        title={editingLead ? 'Edit Lead' : 'New Lead'}
        size="md"
      >
        <form onSubmit={formMethods.handleSubmit(onSubmitLead)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Full Name *</label>
            <input
              {...formMethods.register('fullName')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
              placeholder="Full name"
            />
            {formMethods.formState.errors.fullName && (
              <p className="text-red-400 text-xs mt-1">{formMethods.formState.errors.fullName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Company Name *</label>
            <input
              {...formMethods.register('companyName')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
              placeholder="Company name"
            />
            {formMethods.formState.errors.companyName && (
              <p className="text-red-400 text-xs mt-1">{formMethods.formState.errors.companyName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Email *</label>
            <input
              {...formMethods.register('email')}
              type="email"
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
              placeholder="Email"
            />
            {formMethods.formState.errors.email && (
              <p className="text-red-400 text-xs mt-1">{formMethods.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Phone *</label>
            <input
              {...formMethods.register('phone')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
              placeholder="10 digits"
            />
            {formMethods.formState.errors.phone && (
              <p className="text-red-400 text-xs mt-1">{formMethods.formState.errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Source *</label>
            <select
              {...formMethods.register('source')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
            >
              <option value="Website">Website</option>
              <option value="Referral">Referral</option>
              <option value="Email">Email</option>
              <option value="Event">Event</option>
              <option value="Cold Call">Cold Call</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Status *</label>
            <select
              {...formMethods.register('status')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
            >
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Disqualified">Disqualified</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Expected Value (₹)</label>
            <input
              {...formMethods.register('expectedValue', { valueAsNumber: true })}
              type="number"
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Notes</label>
            <textarea
              {...formMethods.register('notes')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500 h-24 resize-none"
              placeholder="Add notes..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={formMethods.formState.isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {editingLead ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsNewLeadOpen(false);
                setEditingLead(null);
                formMethods.reset();
              }}
              className="flex-1 px-4 py-2 bg-[#16213e] text-white rounded-lg hover:bg-[#16213e]/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Convert to Opportunity Modal */}
      <Modal
        isOpen={!!convertingLead}
        onClose={() => {
          setConvertingLead(null);
          convertMethods.reset();
        }}
        title="Convert to Opportunity"
        size="md"
      >
        {convertingLead && (
          <form onSubmit={convertMethods.handleSubmit(onSubmitConvert as any)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Lead</label>
              <p className="text-white font-medium">{convertingLead.fullName} ({convertingLead.companyName})</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Opportunity Name *</label>
              <input
                {...convertMethods.register('opportunityName')}
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
                placeholder="Opp name"
              />
              {convertMethods.formState.errors.opportunityName && (
                <p className="text-red-400 text-xs mt-1">{convertMethods.formState.errors.opportunityName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Stage *</label>
              <select
                {...convertMethods.register('stage')}
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
              >
                <option value="PROSPECTING">Prospecting</option>
                <option value="PROPOSAL">Proposal</option>
                <option value="NEGOTIATION">Negotiation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Value (₹)</label>
              <input
                {...convertMethods.register('value', { valueAsNumber: true })}
                type="number"
                defaultValue={convertingLead.expectedValue}
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Close Date *</label>
              <input
                {...convertMethods.register('closeDate')}
                type="date"
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
              />
              {convertMethods.formState.errors.closeDate && (
                <p className="text-red-400 text-xs mt-1">{convertMethods.formState.errors.closeDate.message}</p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={convertMethods.formState.isSubmitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Convert
              </button>
              <button
                type="button"
                onClick={() => {
                  setConvertingLead(null);
                  convertMethods.reset();
                }}
                className="flex-1 px-4 py-2 bg-[#16213e] text-white rounded-lg hover:bg-[#16213e]/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
