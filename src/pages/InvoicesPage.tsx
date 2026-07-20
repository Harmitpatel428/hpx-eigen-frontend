import React, { useState } from 'react';
import { useInvoices, useCreateInvoice } from '../hooks/useCrmApi';
import { useAuth } from '../context/AuthContext';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Invoice } from '../types/crm';
import { formatINR, formatDate } from '../utils/crm';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, X, ChevronDown, FileText } from 'lucide-react';

const invoiceSchema = z.object({
  opportunityId: z.string().min(1, 'Opportunity ID required'),
  amount: z.number().min(0, 'Amount must be positive'),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  dueDate: z.string().optional(),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

export function InvoicesPage() {
  const { user } = useAuth();
  const tenantId = (user as any)?.tenantId || '';
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: invoicesData, isLoading } = useInvoices(tenantId);
  const createMut = useCreateInvoice();

  const formMethods = useForm<InvoiceForm>({ resolver: zodResolver(invoiceSchema) });

  const onSubmit = async (data: InvoiceForm) => {
    try {
      await createMut.mutateAsync({ tenantId, ...data });
      toast.success('Invoice created successfully');
      setIsModalOpen(false);
      formMethods.reset();
    } catch (err) {
      toast.error('Failed to create invoice');
    }
  };

  const columns: Column<Invoice>[] = [
    { key: 'id', label: 'Invoice ID', render: (val) => String(val).slice(0, 8) },
    { key: 'opportunityId', label: 'Opportunity ID', render: (val) => String(val).slice(0, 8) },
    { key: 'amount', label: 'Amount', align: 'right', render: (val) => formatINR(Number(val)) },
    { 
      key: 'status', 
      label: 'Status',
      render: (val) => {
        const status = String(val);
        const isSuccess = status === 'PAID';
        const isWarning = status === 'PENDING' || status === 'SENT';
        
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isSuccess ? 'bg-green-100 text-green-700' :
            isWarning ? 'bg-yellow-100 text-yellow-700' :
            'bg-slate-100 text-slate-700'
          }`}>
            {status}
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
          <h1 className="type-title">Invoices</h1>
          <p className="type-body">Manage and track customer invoices</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      {invoicesData?.data && invoicesData.data.length === 0 && !isLoading ? (
        <div style={{ padding: 'var(--space-24) 0', textAlign: 'center' }}>
          <FileText size={32} style={{ margin: '0 auto var(--space-4)', color: 'var(--text-tertiary)' }} />
          <div className="type-h2" style={{ marginBottom: 'var(--space-2)' }}>No invoices found</div>
          <div className="type-body" style={{ color: 'var(--text-tertiary)' }}>Create a new invoice to get started.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-app)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
          <DataTable data={invoicesData?.data || []} columns={columns} isLoading={isLoading} rowKey="id" />
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900">Create New Invoice</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={formMethods.handleSubmit(onSubmit)}>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Opportunity ID</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" {...formMethods.register('opportunityId')} placeholder="Enter Opportunity UUID..." />
                  {formMethods.formState.errors.opportunityId && <p className="text-xs text-red-500 mt-1">{formMethods.formState.errors.opportunityId.message}</p>}
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Amount (INR)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" {...formMethods.register('amount', { valueAsNumber: true })} placeholder="0.00" />
                  {formMethods.formState.errors.amount && <p className="text-xs text-red-500 mt-1">{formMethods.formState.errors.amount.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Status</label>
                  <div className="relative">
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-3.5 pr-10 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" {...formMethods.register('status')}>
                      <option value="DRAFT">Draft</option>
                      <option value="SENT">Sent</option>
                      <option value="PAID">Paid</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Due Date</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" {...formMethods.register('dueDate')} />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button type="button" className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm" disabled={createMut.isPending}>
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
