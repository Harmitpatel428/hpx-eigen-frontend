import type { DocDocumentStatus } from '../types';

// Documentation-progress buckets, computed from the actual document records (never backend aggregates, which
// could disagree). The four buckets PARTITION the applicable statuses: every applicable status maps to exactly
// one, so Received + Approved + Rejected + Pending === Total. NOT_APPLICABLE / WAIVED are not applicable to the
// workload and map to null → excluded from Total (a waived doc must not drag completion down).
//
// REJECTED is its own bucket here (shown as a separate count), so it is NOT in Pending — unlike the reminder's
// "awaiting customer" set (pendingReminder.PENDING_STATUSES), which deliberately rolls rejected in because the
// customer still owes a re-submission. Different question, different set; both are correct.
export type ProgressBucket = 'RECEIVED' | 'APPROVED' | 'REJECTED' | 'PENDING';

// Exhaustive over DocDocumentStatus — the compiler fails this file if a status is added without a bucket.
const BUCKET: Record<DocDocumentStatus, ProgressBucket | null> = {
  REQUESTED:          'PENDING',
  PENDING_COLLECTION: 'PENDING',
  RE_REQUESTED:       'PENDING',
  EXPIRED:            'PENDING',
  RECEIVED:           'RECEIVED',
  UNDER_VERIFICATION: 'RECEIVED',
  APPROVED:           'APPROVED',
  MANAGER_APPROVED:   'APPROVED',
  REJECTED:           'REJECTED',
  NOT_APPLICABLE:     null,
  WAIVED:             null,
};

/** The bucket for a status; an unknown/future value falls to PENDING (safe — surfaces it as needing action). */
export function progressBucket(status: string): ProgressBucket | null {
  return (status in BUCKET) ? BUCKET[status as DocDocumentStatus] : 'PENDING';
}

export interface DocProgress<T> {
  total: number; received: number; approved: number; rejected: number; pending: number;
  percent: number;      // = round(Approved / Total * 100); 0 when Total is 0
  pendingDocs: T[];     // the documents in the Pending bucket, in input order
}

/** Count documents into the progress buckets from their records. Pure; same source for every count. */
export function computeDocProgress<T extends { status: string }>(docs: readonly T[]): DocProgress<T> {
  let received = 0, approved = 0, rejected = 0, pending = 0;
  const pendingDocs: T[] = [];
  for (const d of docs) {
    switch (progressBucket(d.status)) {
      case 'RECEIVED': received++; break;
      case 'APPROVED': approved++; break;
      case 'REJECTED': rejected++; break;
      case 'PENDING':  pending++; pendingDocs.push(d); break;
      // null → not applicable, excluded from Total
    }
  }
  const total = received + approved + rejected + pending;
  const percent = total > 0 ? Math.round((approved / total) * 100) : 0;
  return { total, received, approved, rejected, pending, percent, pendingDocs };
}
