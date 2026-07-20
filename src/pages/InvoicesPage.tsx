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
import { Plus } from 'lucide-react';

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
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
            isSuccess ? 'bg-emerald-500/10 text-emerald-500' :
            isWarning ? 'bg-amber-500/10 text-amber-500' :
            'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
          }`}>
            {status}
          </span>
        );
      }
    },
    { key: 'dueDate', label: 'Due Date', render: (val) => val ? formatDate(String(val)) : '-' },
  ];

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 className="type-h3">Invoices</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> New Invoice
        </button>
      </div>

      <div style={{ background: 'var(--bg-app)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        <DataTable data={invoicesData?.data || []} columns={columns} isLoading={isLoading} rowKey="id" />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Invoice">
        <form onSubmit={formMethods.handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="type-micro">Opportunity ID</label>
            <input type="text" className="form-control" {...formMethods.register('opportunityId')} placeholder="Enter Opportunity UUID..." />
            {formMethods.formState.errors.opportunityId && <span style={{ color: 'var(--color-danger)', fontSize: 12 }}>{formMethods.formState.errors.opportunityId.message}</span>}
          </div>
          
          <div className="form-group">
            <label className="type-micro">Amount (INR)</label>
            <input type="number" className="form-control" {...formMethods.register('amount', { valueAsNumber: true })} placeholder="0.00" />
            {formMethods.formState.errors.amount && <span style={{ color: 'var(--color-danger)', fontSize: 12 }}>{formMethods.formState.errors.amount.message}</span>}
          </div>

          <div className="form-group">
            <label className="type-micro">Status</label>
            <select className="form-control" {...formMethods.register('status')}>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
            </select>
          </div>

          <div className="form-group">
            <label className="type-micro">Due Date</label>
            <input type="date" className="form-control" {...formMethods.register('dueDate')} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={createMut.isPending}>
              {createMut.isPending ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
