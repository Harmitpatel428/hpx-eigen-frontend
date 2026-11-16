import { describe, it, expect } from 'vitest';
import { progressBucket, computeDocProgress } from './docProgress';

// The documented partition — mirrored here so a mapping change must be made in both places deliberately.
const EXPECTED: Record<string, 'RECEIVED' | 'APPROVED' | 'REJECTED' | 'PENDING' | null> = {
  REQUESTED: 'PENDING', PENDING_COLLECTION: 'PENDING', RE_REQUESTED: 'PENDING', EXPIRED: 'PENDING',
  RECEIVED: 'RECEIVED', UNDER_VERIFICATION: 'RECEIVED',
  APPROVED: 'APPROVED', MANAGER_APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NOT_APPLICABLE: null, WAIVED: null,
};

describe('progressBucket', () => {
  it('maps every status to its documented bucket', () => {
    for (const [status, bucket] of Object.entries(EXPECTED)) expect(progressBucket(status)).toBe(bucket);
  });
  it('falls back to PENDING for an unknown/future status', () => {
    expect(progressBucket('SOME_FUTURE_STATUS')).toBe('PENDING');
  });
});

describe('computeDocProgress', () => {
  it('partitions applicable docs so Received+Approved+Rejected+Pending === Total (NA/WAIVED excluded)', () => {
    const docs = [
      { status: 'REQUESTED' }, { status: 'PENDING_COLLECTION' }, // pending x2
      { status: 'RECEIVED' },                                     // received x1
      { status: 'APPROVED' }, { status: 'MANAGER_APPROVED' },     // approved x2
      { status: 'REJECTED' },                                     // rejected x1
      { status: 'NOT_APPLICABLE' }, { status: 'WAIVED' },         // excluded from Total
    ];
    const p = computeDocProgress(docs);
    expect(p).toMatchObject({ total: 6, received: 1, approved: 2, rejected: 1, pending: 2 });
    expect(p.received + p.approved + p.rejected + p.pending).toBe(p.total); // invariant
    expect(p.pendingDocs.map(d => d.status)).toEqual(['REQUESTED', 'PENDING_COLLECTION']);
  });

  it('percent = round(Approved / Total); 0 when there are no applicable docs', () => {
    expect(computeDocProgress([]).percent).toBe(0);
    expect(computeDocProgress([{ status: 'NOT_APPLICABLE' }]).percent).toBe(0); // Total 0 → 0, not NaN
    expect(computeDocProgress([{ status: 'APPROVED' }, { status: 'RECEIVED' }, { status: 'REJECTED' }]).percent).toBe(33); // 1/3
  });
});
