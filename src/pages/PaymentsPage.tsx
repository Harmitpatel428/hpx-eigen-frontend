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
import { Plus, X, ChevronDown, CreditCard } from 'lucide-react';

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
    <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-12)' }}>
        <div>
          <h1 className="type-title" style={{ marginBottom: 'var(--space-2)' }}>Payments</h1>
          <p className="type-body">Track and manage incoming transactions</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Record Payment
          </button>
        </div>
      </div>

      {paymentsData?.data && paymentsData.data.length === 0 && !isLoading ? (
        <div style={{ padding: 'var(--space-24) 0', textAlign: 'center' }}>
          <CreditCard size={32} style={{ margin: '0 auto var(--space-4)', color: 'var(--text-tertiary)' }} />
          <div className="type-h2" style={{ marginBottom: 'var(--space-2)' }}>No payments recorded</div>
          <div className="type-body" style={{ color: 'var(--text-tertiary)' }}>Record your first payment to keep track of revenue.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-app)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
          <DataTable data={paymentsData?.data || []} columns={columns} isLoading={isLoading} rowKey="id" />
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900">Record New Payment</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={formMethods.handleSubmit(onSubmit)}>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Invoice ID</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" {...formMethods.register('invoiceId')} placeholder="Enter Invoice UUID..." />
                  {formMethods.formState.errors.invoiceId && <p className="text-xs text-red-500 mt-1">{formMethods.formState.errors.invoiceId.message}</p>}
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Amount (INR)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" {...formMethods.register('amount', { valueAsNumber: true })} placeholder="0.00" />
                  {formMethods.formState.errors.amount && <p className="text-xs text-red-500 mt-1">{formMethods.formState.errors.amount.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Method</label>
                  <div className="relative">
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-3.5 pr-10 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" {...formMethods.register('method')}>
                      <option value="CASH">Cash</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Paid At</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" {...formMethods.register('paidAt')} />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button type="button" className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm" disabled={createMut.isPending}>
                  {createMut.isPending ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
