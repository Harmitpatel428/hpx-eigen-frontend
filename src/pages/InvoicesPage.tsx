import React, { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../auth/public';
import { DataTable, Column } from '../components/DataTable';
import { Invoice } from '../types';
import { formatINR, formatDate } from '../utils/crm';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '../components/notifications/notify';
import { Plus, X, ChevronDown, FileText, User, Building, Phone, Mail, IndianRupee } from 'lucide-react';

// @react-pdf/renderer is ~470 KB gzipped; load it as its own chunk only when an
// invoice row's download control renders, not as part of the InvoicesPage chunk.
const InvoiceDownloadLink = React.lazy(() => import('../components/pdf/InvoiceDownloadLink'));

const invoiceSchema = z.object({
  opportunityId: z.string().min(1, 'Opportunity required'),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  amount: z.number().min(0, 'Amount must be positive'),
  taxPercentage: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  otherCharges: z.number().min(0).optional(),
  paymentTerms: z.string().optional(),
  internalNotes: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

export function InvoicesPage() {
  const { user } = useAuth();
  const tenantId = (user as any)?.tenantId || localStorage.getItem('tenantId') || '';
  const [isModalOpen, setIsModalOpen] = useState(false);

  const queryClient = useQueryClient();
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', tenantId],
    queryFn: () => api.get('/api/v1/invoices').then(r => r.data),
  });
  const { data: oppsData, isLoading: oppsLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => api.get('/api/v1/opportunities').then(r => r.data?.data || r.data || []),
  });
  const opportunities = Array.isArray(oppsData) ? oppsData : (oppsData?.data || []);
  const createMut = useMutation({
    mutationFn: ({ tenantId: _tid, ...invoice }: any) => api.post('/api/v1/invoices', invoice).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const formMethods = useForm<InvoiceForm>({ 
    resolver: zodResolver(invoiceSchema),
    defaultValues: { amount: 0, taxPercentage: 0, discount: 0, otherCharges: 0, status: 'DRAFT' }
  });

  const selectedOppId = useWatch({ control: formMethods.control, name: 'opportunityId' });
  const selectedOpp = opportunities.find((opp: any) => opp.id === selectedOppId);

  const amount = useWatch({ control: formMethods.control, name: 'amount' }) || 0;
  const taxPercentage = useWatch({ control: formMethods.control, name: 'taxPercentage' }) || 0;
  const discount = useWatch({ control: formMethods.control, name: 'discount' }) || 0;
  const otherCharges = useWatch({ control: formMethods.control, name: 'otherCharges' }) || 0;

  const baseAfterDiscount = amount - discount;
  const taxAmount = baseAfterDiscount > 0 ? (baseAfterDiscount * taxPercentage) / 100 : 0;
  const totalAmount = baseAfterDiscount + taxAmount + otherCharges;

  // Auto-fill amount if opportunity is selected
  useEffect(() => {
    if (selectedOpp && !formMethods.formState.isDirty) {
      formMethods.setValue('amount', Number(selectedOpp.value || 0));
    }
  }, [selectedOpp, formMethods]);

  const onSubmit = async (data: InvoiceForm) => {
    try {
      await createMut.mutateAsync({ tenantId, ...data });
      toast.success('Invoice created successfully');
      setIsModalOpen(false);
      formMethods.reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    }
  };

  const columns: Column<Invoice>[] = [
    { key: 'invoiceNumber', label: 'Invoice No.', render: (val, inv) => <span className="font-medium text-[var(--text-primary)]">{val || String(inv.id).slice(0, 8)}</span> },
    { key: 'invoiceDate', label: 'Date', render: (val) => val ? formatDate(String(val)) : '-' },
    { key: 'amount', label: 'Subtotal', align: 'right', render: (val) => <span className="text-[var(--text-tertiary)]">{formatINR(Number(val))}</span> },
    { key: 'totalAmount', label: 'Total Amount', align: 'right', render: (val) => <span className="font-semibold text-[var(--text-primary)]">{formatINR(Number(val))}</span> },
    { 
      key: 'status', 
      label: 'Status',
      render: (val) => {
        const status = String(val);
        const isSuccess = status === 'PAID';
        const isPartial = status === 'PARTIALLY_PAID';
        const isWarning = status === 'DRAFT' || status === 'SENT';
        
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isSuccess ? 'bg-[var(--color-success-tint)] text-[var(--color-success)]' :
            isPartial ? 'bg-[var(--color-info-tint)] text-[var(--color-info)]' :
            isWarning ? 'bg-[var(--bg-muted)] text-[var(--text-secondary)]' :
            'bg-[var(--color-danger-tint)] text-[var(--color-danger)]'
          }`}>
            {status.replace('_', ' ')}
          </span>
        );
      }
    },
    { key: 'dueDate', label: 'Due Date', render: (val) => val ? formatDate(String(val)) : '-' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Invoices</h1>
          <p className="text-sm text-[var(--text-tertiary)]">Manage and track customer invoices</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="flex items-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--text-inverse)] px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      {invoicesData?.data && invoicesData.data.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-[var(--surface-overlay)] rounded-xl border border-[var(--border-light)] border-dashed">
          <FileText size={48} className="text-[var(--text-tertiary)] mb-4" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No invoices found</h2>
          <p className="text-sm text-[var(--text-tertiary)]">Create a new invoice to get started.</p>
        </div>
      ) : (
        <div className="bg-[var(--surface-overlay)] rounded-xl border border-[var(--border-light)] shadow-sm overflow-hidden">
          <DataTable
            data={invoicesData?.data || []}
            columns={columns}
            isLoading={isLoading}
            rowKey="id"
            rowActions={(invoice) => (
              <Suspense fallback={
                <span className="inline-flex items-center justify-center p-1.5">
                  <span className="w-4 h-4 border-2 border-[var(--border-medium)] border-t-[var(--text-primary)] rounded-full animate-spin" />
                </span>
              }>
                <InvoiceDownloadLink invoice={invoice} />
              </Suspense>
            )}
          />
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[var(--surface-overlay)] w-full max-w-2xl rounded-2xl shadow-2xl border border-[var(--border-light)] overflow-hidden my-8">
            <div className="px-6 py-5 border-b border-[var(--border-light)] flex justify-between items-center bg-[var(--surface-overlay)] sticky top-0 z-10">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create New Invoice</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 -mr-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={formMethods.handleSubmit(onSubmit)}>
              <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                
                {/* 1. Customer Selection */}
                <section>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2"><User size={16} className="text-[var(--text-tertiary)]"/> Customer Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Select Opportunity</label>

                      <div className="relative">
                        <select 
                          {...formMethods.register("opportunityId")} 
                          className="w-full bg-[var(--surface-overlay)] border border-[var(--border-medium)] rounded-lg py-2.5 pl-3.5 pr-10 text-sm text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all shadow-sm disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-tertiary)]"
                          disabled={opportunities.length === 0}
                        >
                          <option value="">{oppsLoading ? "Loading opportunities..." : "Select Opportunity..."}</option>
                          {opportunities.map((opp: any) => {
                            return <option key={opp.id} value={opp.id}>{opp.title || opp.name}</option>;
                          })}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--text-tertiary)]">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                      {!oppsLoading && opportunities.length === 0 && (
                        <p className="text-xs text-[var(--color-danger)] mt-1 font-medium">No opportunities found. Please create an opportunity in the CRM first.</p>
                      )}
                      {formMethods.formState.errors.opportunityId && <p className="text-xs text-[var(--color-danger)] mt-1.5 font-medium">{formMethods.formState.errors.opportunityId.message}</p>}
                    </div>

                    {selectedOpp && (
                      <div className="bg-[var(--bg-subtle)] border border-[var(--border-light)] rounded-lg p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedOpp.title}</span>
                            <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 mt-1">
                              <IndianRupee size={12}/> {formatINR(Number(selectedOpp.value))} • {selectedOpp.stage.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                              <User size={14} className="text-[var(--text-tertiary)]" />
                              <span className="font-medium text-[var(--text-primary)]">
                                {selectedOpp.contact ? `${selectedOpp.contact.firstName} ${selectedOpp.contact.lastName}` : `${selectedOpp.lead?.firstName} ${selectedOpp.lead?.lastName}`}
                              </span>
                            </div>
                            {(selectedOpp.lead?.company || selectedOpp.contact?.company) && (
                              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                <Building size={14} className="text-[var(--text-tertiary)]" />
                                <span>{selectedOpp.lead?.company || selectedOpp.contact?.company}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {(selectedOpp.contact?.email || selectedOpp.lead?.email) && (
                              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                <Mail size={14} className="text-[var(--text-tertiary)]" />
                                <span>{selectedOpp.contact?.email || selectedOpp.lead?.email}</span>
                              </div>
                            )}
                            {(selectedOpp.contact?.phone || selectedOpp.lead?.phone) && (
                              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                <Phone size={14} className="text-[var(--text-tertiary)]" />
                                <span>{selectedOpp.contact?.phone || selectedOpp.lead?.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <hr className="border-[var(--border-light)]" />

                {/* 2. Invoice Details */}
                <section>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2"><FileText size={16} className="text-[var(--text-tertiary)]"/> Invoice Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Invoice Number <span className="text-[var(--text-tertiary)] font-normal">(Auto if empty)</span></label>
                      <input type="text" className="w-full bg-[var(--surface-overlay)] border border-[var(--border-medium)] rounded-lg py-2 px-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] shadow-sm" {...formMethods.register('invoiceNumber')} placeholder="INV-..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Status</label>
                      <div className="relative">
                        <select className="w-full bg-[var(--surface-overlay)] border border-[var(--border-medium)] rounded-lg py-2 pl-3.5 pr-10 text-sm text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] shadow-sm" {...formMethods.register('status')}>
                          <option value="DRAFT">Draft</option>
                          <option value="SENT">Sent</option>
                          <option value="PAID">Paid</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--text-tertiary)]">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Invoice Date</label>
                      <input type="date" className="w-full bg-[var(--surface-overlay)] border border-[var(--border-medium)] rounded-lg py-2 px-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] shadow-sm" {...formMethods.register('invoiceDate')} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Due Date</label>
                      <input type="date" className="w-full bg-[var(--surface-overlay)] border border-[var(--border-medium)] rounded-lg py-2 px-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] shadow-sm" {...formMethods.register('dueDate')} />
                    </div>
                  </div>
                </section>

                <hr className="border-[var(--border-light)]" />

                {/* 3. Financials */}
                <section>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2"><IndianRupee size={16} className="text-[var(--text-tertiary)]"/> Financials</h3>
                  <div className="bg-[var(--bg-subtle)] border border-[var(--border-light)] rounded-xl p-5 space-y-4">
                    
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Subtotal Amount (₹)</label>
                        <input type="number" step="0.01" className="w-full bg-[var(--surface-overlay)] border border-[var(--border-medium)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] shadow-sm" {...formMethods.register('amount', { valueAsNumber: true })} />
                        {formMethods.formState.errors.amount && <p className="text-xs text-[var(--color-danger)] mt-1">{formMethods.formState.errors.amount.message}</p>}
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Discount (₹)</label>
                        <input type="number" step="0.01" className="w-full bg-[var(--surface-overlay)] border border-[var(--border-medium)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] shadow-sm" {...formMethods.register('discount', { valueAsNumber: true })} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Tax (%)</label>
                        <input type="number" step="0.01" className="w-full bg-[var(--surface-overlay)] border border-[var(--border-medium)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] shadow-sm" {...formMethods.register('taxPercentage', { valueAsNumber: true })} />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Other Charges (₹)</label>
                        <input type="number" step="0.01" className="w-full bg-[var(--surface-overlay)] border border-[var(--border-medium)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] shadow-sm" {...formMethods.register('otherCharges', { valueAsNumber: true })} />
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[var(--border-light)]">
                      <div className="flex justify-between items-center text-sm text-[var(--text-secondary)] mb-2">
                        <span>Tax Amount:</span>
                        <span className="font-medium">₹ {taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-base font-bold text-[var(--text-primary)]">
                        <span>Total Amount:</span>
                        <span>₹ {totalAmount.toFixed(2)}</span>
                      </div>
                    </div>

                  </div>
                </section>
                
                {/* 4. Additional Information */}
                <section>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Payment Terms</label>
                      <input type="text" className="w-full bg-[var(--surface-overlay)] border border-[var(--border-medium)] rounded-lg py-2 px-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] shadow-sm" {...formMethods.register('paymentTerms')} placeholder="e.g. Net 30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Internal Notes</label>
                      <input type="text" className="w-full bg-[var(--surface-overlay)] border border-[var(--border-medium)] rounded-lg py-2 px-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] shadow-sm" {...formMethods.register('internalNotes')} placeholder="Private notes" />
                    </div>
                  </div>
                </section>

              </div>

              <div className="px-6 py-4 bg-[var(--bg-subtle)] border-t border-[var(--border-light)] flex justify-end gap-3 rounded-b-2xl">
                <button type="button" className="px-4 py-2.5 rounded-lg text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[var(--text-inverse)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={createMut.isPending}>
                  {createMut.isPending ? 'Saving...' : 'Save Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
