// I2: client-side duplicate-checksum pre-flight (Phase 1 cert closure).
// Pure helper — no I/O. Warns the uploader before submit; the server's own
// duplicate-409 guard (see FirmDocumentUploadDialog catch block) is the real gate.

export interface DupCandidate {
  checksum: string | null;
  isActive: boolean;
  category: 'REQUIREMENT' | 'GENERAL';
  requirementId: string | null;
}
export type DupTarget = { category: 'REQUIREMENT' | 'GENERAL'; requirementId?: string };

/**
 * I2: find an ACTIVE document in the SAME bucket whose checksum equals `checksum`.
 * Bucket = same requirementId for a REQUIREMENT target; the general bucket (category
 * GENERAL) for a GENERAL target. Returns the first match, or null. A null/empty
 * checksum on either side never matches.
 */
export function findDuplicateByChecksum<T extends DupCandidate>(
  docs: T[], checksum: string, target: DupTarget,
): T | null {
  if (!checksum) return null;
  const inBucket = (d: T) =>
    target.category === 'REQUIREMENT'
      ? d.category === 'REQUIREMENT' && d.requirementId === target.requirementId
      : d.category === 'GENERAL';
  return docs.find((d) => d.isActive && d.checksum === checksum && inBucket(d)) ?? null;
}
