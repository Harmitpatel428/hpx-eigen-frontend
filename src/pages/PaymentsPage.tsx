import React, { useState } from 'react';
import { usePayments, useCreatePayment } from '../hooks/useCrmApi';
import { useAuth } from '../context/AuthContext';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Payment } from '../types/crm';
import { formatINR, formatDate } from '../utils/crm';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID required'),
  amount: z.number().min(0, 'Amount must be positive'),
  method: z.enum(['CREDIT_CARD', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CASH']).optional(),
  paidAt: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

export function PaymentsPage() {
  const { user } = useAuth();
  const tenantId = (user as any)?.tenantId || '';
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: paymentsData, isLoading } = usePayments(tenantId);
  const createMut = useCreatePayment();

  const formMethods = useForm<PaymentForm>({ resolver: zodResolver(paymentSchema) });

  const onSubmit = async (data: PaymentForm) => {
    try {
      await createMut.mutateAsync({ tenantId, ...data });
      toast.success('Payment recorded successfully');
      setIsModalOpen(false);
      formMethods.reset();
    } catch (err) {
      toast.error('Failed to record payment');
    }
  };

  const columns: Column<Payment>[] = [
    { key: 'id', label: 'Payment ID', render: (val) => String(val).slice(0, 8) },
    { key: 'invoiceId', label: 'Invoice ID', render: (val) => String(val).slice(0, 8) },
    { key: 'amount', label: 'Amount', align: 'right', render: (val) => formatINR(Number(val)) },
    { key: 'method', label: 'Method', render: (val) => String(val).replace('_', ' ') },
    { key: 'paidAt', label: 'Paid At', render: (val) => val ? formatDate(String(val)) : '-' },
  ];

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 className="type-h3">Payments</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Record Payment
        </button>
      </div>

      <div style={{ background: 'var(--bg-app)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        <DataTable data={paymentsData?.data || []} columns={columns} isLoading={isLoading} rowKey="id" />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record New Payment">
        <form onSubmit={formMethods.handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="type-micro">Invoice ID</label>
            <input type="text" className="form-control" {...formMethods.register('invoiceId')} placeholder="Enter Invoice UUID..." />
            {formMethods.formState.errors.invoiceId && <span style={{ color: 'var(--color-danger)', fontSize: 12 }}>{formMethods.formState.errors.invoiceId.message}</span>}
          </div>
          
          <div className="form-group">
            <label className="type-micro">Amount (INR)</label>
            <input type="number" className="form-control" {...formMethods.register('amount', { valueAsNumber: true })} placeholder="0.00" />
            {formMethods.formState.errors.amount && <span style={{ color: 'var(--color-danger)', fontSize: 12 }}>{formMethods.formState.errors.amount.message}</span>}
          </div>

          <div className="form-group">
            <label className="type-micro">Method</label>
            <select className="form-control" {...formMethods.register('method')}>
              <option value="CASH">Cash</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div className="form-group">
            <label className="type-micro">Paid At</label>
            <input type="date" className="form-control" {...formMethods.register('paidAt')} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={createMut.isPending}>
              {createMut.isPending ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
