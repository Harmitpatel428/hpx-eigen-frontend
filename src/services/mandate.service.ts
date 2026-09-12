/**
 * Mandate Lifecycle — typed API client.
 *
 * Single source of truth for the mandate endpoints on the frontend. Types mirror
 * the backend contract (hpx-eigen-s1-foundation/outputs/mandate-api-contract.ts).
 * Staff endpoints go through the authed `api` instance; the two public
 * (token-authenticated) endpoints use a bare client with no auth interceptor so a
 * stray 401 never bounces a public visitor to /login.
 */
import axios from 'axios';
import { api } from './api';

const baseURL = import.meta.env.VITE_API_BASE_URL || '';
const publicApi = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });

function unwrap<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

// ─── Types ────────────────────────────────────────────────────────────────

export type MandateRequestStatus =
  | 'PENDING_UPLOAD' | 'UPLOADED' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'SUPERSEDED';

export type AllowedContentType = 'application/pdf' | 'image/jpeg' | 'image/png';

export const MANDATE_POLICY = {
  MAX_FILE_SIZE_BYTES: 5_242_880,
  ALLOWED_CONTENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png'] as AllowedContentType[],
} as const;

export interface SendMandateRequest {
  mandateType: string;
  description?: string;
  sendEmail?: boolean;
}
export interface SendMandateResponse {
  mandateRequestId: string;
  uploadToken: string;
  expiresAt: string;
}

export interface RequestUploadUrlRequest {
  token: string;
  fileName: string;
  contentType: AllowedContentType;
  fileSizeBytes: number;
}
export interface RequestUploadUrlResponse {
  uploadUrl: string;
  uploadId: string;
  expiresAt: string;
}

export interface ConfirmUploadRequest {
  token: string;
  uploadId: string;
  fileName: string;
}
export interface ConfirmUploadResponse {
  uploadId: string;
  status: 'UPLOADED';
}

export interface TransitionResponse {
  mandateRequestId: string;
  status: MandateRequestStatus;
}

export interface GetViewUrlResponse {
  viewUrl: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  expiresAt: string;
}

export interface MandateUploadSummary {
  id: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedAt: string;
}
export interface MandateRequestSummary {
  id: string;
  mandateType: string;
  status: MandateRequestStatus;
  sentToEmail: string | null;   // masked server-side
  sentByUserId: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  tokenExpiresAt: string;
  createdAt: string;
  uploads: MandateUploadSummary[];
}

// ─── Error mapping ──────────────────────────────────────────────────────────

/** Maps a backend HTTP status to a user-facing message. */
export function mandateErrorMessage(status?: number, fallback = 'Something went wrong. Please try again.'): string {
  switch (status) {
    case 400: return 'Invalid input. Please check your file format and size.';
    case 401:
    case 403: return 'You do not have permission to perform this action.';
    case 404: return 'Record not found.';
    case 409: return 'Upload conflict. Please try again.';
    case 410: return 'This upload link has expired. Please contact your advisor for a new link.';
    case 413: return 'File is too large. Maximum size is 5 MB.';
    case 415: return 'File type not supported. Please upload a PDF, JPG, or PNG.';
    case 422: return 'Cannot complete this action for the current case state.';
    case 429: return 'Too many attempts. Please wait an hour.';
    default:  return fallback;
  }
}

// ─── Direct-to-R2 upload (presigned PUT) with progress ──────────────────────

export function uploadToPresigned(
  uploadUrl: string,
  file: File,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
    if (signal) signal.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

// ─── Service ──────────────────────────────────────────────────────────────

export const mandateService = {
  // Staff (authed)
  send: async (caseId: string, body: SendMandateRequest): Promise<SendMandateResponse> =>
    unwrap(await api.post(`/api/v1/cases/${caseId}/mandate/send`, body)),

  listForCase: async (caseId: string): Promise<MandateRequestSummary[]> =>
    unwrap(await api.get(`/api/v1/cases/${caseId}/mandate`)),

  verify: async (mandateRequestId: string): Promise<TransitionResponse> =>
    unwrap(await api.post(`/api/v1/mandate/${mandateRequestId}/verify`)),

  reject: async (mandateRequestId: string, reason: string): Promise<TransitionResponse> =>
    unwrap(await api.post(`/api/v1/mandate/${mandateRequestId}/reject`, { reason })),

  regenerateLink: async (mandateRequestId: string): Promise<SendMandateResponse> =>
    unwrap(await api.post(`/api/v1/mandate/${mandateRequestId}/regenerate-link`)),

  getViewUrl: async (uploadId: string): Promise<GetViewUrlResponse> =>
    unwrap(await api.get(`/api/v1/mandate/uploads/${uploadId}/view-url`)),

  // Public (token in body is the credential)
  requestUploadUrl: async (body: RequestUploadUrlRequest): Promise<RequestUploadUrlResponse> =>
    unwrap(await publicApi.post('/api/v1/mandate/upload-url', body)),

  confirmUpload: async (body: ConfirmUploadRequest): Promise<ConfirmUploadResponse> =>
    unwrap(await publicApi.post('/api/v1/mandate/confirm-upload', body)),

  uploadToPresigned,
};
