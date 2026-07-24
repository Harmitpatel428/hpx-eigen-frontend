import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { formatINRFull } from '../../utils/crm';
import { Invoice } from '../../types/crm';

interface InvoicePdfProps {
  invoice: Invoice;
}

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#475569',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 36,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  brandBlock: {
    flexDirection: 'column',
  },
  brandName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    letterSpacing: 1,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 9,
    color: '#94a3b8',
    letterSpacing: 0.3,
  },
  invoiceTitleBlock: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  metaGrid: {
    flexDirection: 'row',
  },
  metaCell: {
    flex: 1,
    paddingRight: 16,
  },
  metaLabel: {
    fontSize: 8,
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Helvetica-Bold',
  },
  metaValue: {
    fontSize: 11,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
  },
  badgeWrap: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  billToSection: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  billToName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  billToCompany: {
    fontSize: 11,
    color: '#475569',
  },
  table: {
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tableHeaderText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  col1: { flex: 4 },
  col2: { flex: 1, textAlign: 'right' },
  col3: { flex: 2, textAlign: 'right' },
  col4: { flex: 2, textAlign: 'right' },
  cellText: {
    fontSize: 11,
    color: '#0f172a',
  },
  cellSubText: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
  },
  totalsWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 36,
  },
  totalsBlock: {
    width: 220,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 11,
    color: '#475569',
  },
  totalValue: {
    fontSize: 11,
    color: '#0f172a',
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginVertical: 10,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  grandTotalValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    fontSize: 9,
    color: '#94a3b8',
  },
  footerRight: {
    fontSize: 9,
    color: '#94a3b8',
  },
});

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'PAID':           return '#16a34a';
    case 'SENT':           return '#0f172a';
    case 'PARTIALLY_PAID': return '#2563eb';
    case 'OVERDUE':        return '#dc2626';
    case 'CANCELLED':      return '#94a3b8';
    default:               return '#64748b'; // DRAFT
  }
}

function safeNumber(value: number | string | undefined | null): number {
  return Number(value) || 0;
}

function formatLocalDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '-';
  try {
    return new Date(isoDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

export function InvoicePdfDocument({ invoice }: InvoicePdfProps) {
  const statusColor = getStatusBadgeColor(invoice.status);

  const lead    = invoice.opportunity?.lead;
  const contact = invoice.opportunity?.contact;

  const customerName = lead
    ? `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || 'N/A'
    : contact
    ? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || 'N/A'
    : 'N/A';

  const customerCompany = lead?.company || contact?.company || '-';
  const opportunityTitle = invoice.opportunity?.title || 'Professional Services';

  const amount     = safeNumber(invoice.amount);
  const taxAmount  = safeNumber(invoice.taxAmount);
  const total      = safeNumber(invoice.totalAmount);
  const discount   = safeNumber(invoice.discount);
  const subtotal   = amount - discount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandBlock}>
              <Text style={styles.brandName}>HPX EIGEN</Text>
              <Text style={styles.brandTagline}>
                Relationship Intelligence for the Modern Enterprise
              </Text>
            </View>
            <View style={styles.invoiceTitleBlock}>
              <Text style={styles.invoiceTitle}>INVOICE</Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Invoice No.</Text>
              <Text style={styles.metaValue}>
                {invoice.invoiceNumber || `INV-${invoice.id.slice(0, 8).toUpperCase()}`}
              </Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Status</Text>
              <View style={styles.badgeWrap}>
                <View style={[styles.badge, { backgroundColor: statusColor }]}>
                  <Text style={styles.badgeText}>
                    {invoice.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Invoice Date</Text>
              <Text style={styles.metaValue}>{formatLocalDate(invoice.invoiceDate)}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Due Date</Text>
              <Text style={styles.metaValue}>{formatLocalDate(invoice.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.billToSection}>
          <Text style={styles.sectionLabel}>Bill To</Text>
          <Text style={styles.billToName}>{customerName}</Text>
          <Text style={styles.billToCompany}>{customerCompany}</Text>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.col1]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.col3]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.col4]}>Amount</Text>
          </View>
          <View style={styles.tableRowLast}>
            <View style={styles.col1}>
              <Text style={styles.cellText}>{opportunityTitle}</Text>
              {discount > 0 && (
                <Text style={styles.cellSubText}>
                  Discount: {formatINRFull(discount)}
                </Text>
              )}
            </View>
            <Text style={[styles.cellText, styles.col2]}>1</Text>
            <Text style={[styles.cellText, styles.col3]}>{formatINRFull(amount)}</Text>
            <Text style={[styles.cellText, styles.col4]}>{formatINRFull(subtotal)}</Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsWrapper}>
          <View style={styles.totalsBlock}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatINRFull(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                GST ({safeNumber(invoice.taxPercentage).toFixed(0)}%)
              </Text>
              <Text style={styles.totalValue}>{formatINRFull(taxAmount)}</Text>
            </View>
            {safeNumber(invoice.otherCharges) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Other Charges</Text>
                <Text style={styles.totalValue}>
                  {formatINRFull(safeNumber(invoice.otherCharges))}
                </Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total Due</Text>
              <Text style={styles.grandTotalValue}>{formatINRFull(total)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLeft}>
            Thank you for your business. Payment due by {formatLocalDate(invoice.dueDate)}.
          </Text>
          <Text style={styles.footerRight}>
            HPX Eigen CRM {String.fromCharCode(169)} {new Date().getFullYear()}
          </Text>
        </View>

      </Page>
    </Document>
  );
}
