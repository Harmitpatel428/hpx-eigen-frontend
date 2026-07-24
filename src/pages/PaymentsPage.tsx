import React, { useState, useEffect } from 'react';
import { usePayments, useCreatePayment, useInvoices } from '../hooks/useCrmApi';
import { useAuth } from '../context/AuthContext';
import { DataTable, Column } from '../components/DataTable';
import { Payment } from '../types';
import { formatINR, formatDate } from '../utils/crm';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, X, ChevronDown, CreditCard, FileText, IndianRupee } from 'lucide-react';

const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice required'),
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  method: z.enum(['CREDIT_CARD', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CASH', 'NEFT', 'RTGS', 'IMPS', 'OTHER']).optional(),
  referenceNumber: z.string().optional(),
  bankName: z.string().optional(),
  chequeNumber: z.string().optional(),
  status: z.enum(['PENDING', 'RECEIVED', 'FAILED', 'REFUNDED', 'CANCELLED']).optional(),
  receivedBy: z.string().optional(),
  notes: z.string().optional(),
  paidAt: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

export function PaymentsPage() {
  const { user } = useAuth();
  const tenantId = (user as any)?.tenantId || localStorage.getItem('tenantId') || '';
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: paymentsData, isLoading } = usePayments(tenantId);
  const { data: invoicesData } = useInvoices(tenantId, { status: 'SENT' } as any); // Or fetch all open invoices
  const createMut = useCreatePayment();

  const formMethods = useForm<PaymentForm>({ 
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 0, method: 'BANK_TRANSFER', status: 'RECEIVED' }
  });

  const selectedInvoiceId = useWatch({ control: formMethods.control, name: 'invoiceId' });
  const selectedInvoice = invoicesData?.data?.find((inv: any) => inv.id === selectedInvoiceId);

  // Auto-fill amount if invoice is selected
  useEffect(() => {
    if (selectedInvoice && !formMethods.formState.isDirty) {
      const amountDue = selectedInvoice.totalAmount || selectedInvoice.amount || 0;
      formMethods.setValue('amount', Number(amountDue));
    }
  }, [selectedInvoice, formMethods]);

  const onSubmit = async (data: PaymentForm) => {
    try {
      await createMut.mutateAsync({ tenantId, ...data });
      toast.success('Payment recorded successfully');
      setIsModalOpen(false);
      formMethods.reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const columns: Column<Payment>[] = [
    { key: 'referenceNumber', label: 'Ref No.', render: (val, p) => <span className="font-medium text-slate-900">{val || String(p.id).slice(0, 8)}</span> },
    { key: 'invoiceId', label: 'Invoice', render: (val) => <span className="text-slate-600 font-medium">{(val as string).slice(0, 8)}</span> },
    { key: 'amount', label: 'Amount', align: 'right', render: (val) => <span className="font-semibold text-slate-900">{formatINR(Number(val))}</span> },
    { key: 'method', label: 'Method', render: (val) => String(val).replace(/_/g, ' ') },
    { 
      key: 'status', 
      label: 'Status',
      render: (val) => {
        const status = String(val);
        const isSuccess = status === 'RECEIVED';
        const isWarning = status === 'PENDING';
        
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isSuccess ? 'bg-green-100 text-green-700 border border-green-200' :
            isWarning ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
            'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            {status}
          </span>
        );
      }
    },
    { key: 'paidAt', label: 'Date', render: (val) => val ? formatDate(String(val)) : '-' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500">Track and manage incoming transactions</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Record Payment
          </button>
        </div>
      </div>

      {paymentsData?.data && paymentsData.data.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-slate-200 border-dashed">
          <CreditCard size={48} className="text-slate-300 mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-1">No payments recorded</h2>
          <p className="text-sm text-slate-500">Record your first payment to keep track of revenue.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <DataTable data={paymentsData?.data || []} columns={columns} isLoading={isLoading} rowKey="id" />
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-lg font-semibold text-slate-900">Record New Payment</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={formMethods.handleSubmit(onSubmit)}>
              <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                
                {/* 1. Invoice Selection */}
                <section>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2"><FileText size={16} className="text-slate-400"/> Invoice Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Select Invoice</label>
                      <div className="relative">
                        <select className="w-full bg-white border border-slate-300 rounded-lg py-2.5 pl-3.5 pr-10 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm" {...formMethods.register('invoiceId')}>
                          <option value="">Select Invoice...</option>
                          {invoicesData?.data?.map((inv: any) => (
                            <option key={inv.id} value={inv.id}>{inv.invoiceNumber || inv.id.slice(0,8)} - {formatINR(Number(inv.totalAmount || inv.amount))}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                      {formMethods.formState.errors.invoiceId && <p className="text-xs text-red-500 mt-1.5 font-medium">{formMethods.formState.errors.invoiceId.message}</p>}
                    </div>

                    {selectedInvoice && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-900">Invoice {selectedInvoice.invoiceNumber || selectedInvoice.id.slice(0,8)}</div>
                          <div className="text-xs font-medium px-2 py-1 bg-slate-200 text-slate-700 rounded-md">{selectedInvoice.status}</div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <span className="flex items-center gap-1"><IndianRupee size={12}/> Total: {formatINR(Number(selectedInvoice.totalAmount || selectedInvoice.amount))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <hr className="border-slate-100" />

                {/* 2. Payment Information */}
                <section>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2"><CreditCard size={16} className="text-slate-400"/> Payment Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Amount (₹)</label>
                      <input type="number" step="0.01" className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm" {...formMethods.register('amount', { valueAsNumber: true })} />
                      {formMethods.formState.errors.amount && <p className="text-xs text-red-500 mt-1">{formMethods.formState.errors.amount.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Date Paid</label>
                      <input type="date" className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm" {...formMethods.register('paidAt')} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Payment Method</label>
                      <div className="relative">
                        <select className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-3.5 pr-10 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm" {...formMethods.register('method')}>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="CREDIT_CARD">Credit Card</option>
                          <option value="UPI">UPI</option>
                          <option value="NEFT">NEFT</option>
                          <option value="RTGS">RTGS</option>
                          <option value="IMPS">IMPS</option>
                          <option value="CHEQUE">Cheque</option>
                          <option value="CASH">Cash</option>
                          <option value="OTHER">Other</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Status</label>
                      <div className="relative">
                        <select className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-3.5 pr-10 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm" {...formMethods.register('status')}>
                          <option value="PENDING">Pending</option>
                          <option value="RECEIVED">Received</option>
                          <option value="FAILED">Failed</option>
                          <option value="REFUNDED">Refunded</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <hr className="border-slate-100" />

                {/* 3. Transaction Details */}
                <section>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">Transaction Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Reference / UTR Number</label>
                      <input type="text" className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm" {...formMethods.register('referenceNumber')} placeholder="e.g. UTR123456" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Bank Name</label>
                      <input type="text" className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm" {...formMethods.register('bankName')} placeholder="e.g. HDFC Bank" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Cheque Number</label>
                      <input type="text" className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm" {...formMethods.register('chequeNumber')} placeholder="If applicable" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Received By</label>
                      <input type="text" className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm" {...formMethods.register('receivedBy')} placeholder="Name of recipient" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Notes</label>
                    <textarea className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm resize-y" rows={2} {...formMethods.register('notes')} placeholder="Any additional notes..." />
                  </div>
                </section>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-2xl">
                <button type="button" className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={createMut.isPending}>
                  {createMut.isPending ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
