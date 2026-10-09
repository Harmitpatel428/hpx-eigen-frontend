import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download } from 'lucide-react';
import type { Invoice } from '../../types';
import { InvoicePdfDocument } from './InvoicePdfDocument';

// Isolated so it can be React.lazy()'d: pulls the heavy @react-pdf/renderer bundle
// into its own chunk that loads only when an invoice row actually renders a
// download control, instead of being parsed as part of the InvoicesPage chunk.
// UI/behavior identical to the previous inline PDFDownloadLink.
export default function InvoiceDownloadLink({ invoice }: { invoice: Invoice }) {
  return (
    <PDFDownloadLink
      document={<InvoicePdfDocument invoice={invoice} />}
      fileName={`Invoice-${invoice.invoiceNumber || invoice.id.slice(0, 8)}.pdf`}
    >
      {({ loading }) => (
        <button
          className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={loading}
          title={loading ? 'Preparing PDF...' : 'Download Invoice PDF'}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          ) : (
            <Download size={15} />
          )}
        </button>
      )}
    </PDFDownloadLink>
  );
}
