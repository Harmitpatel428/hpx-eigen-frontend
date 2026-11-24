import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../notifications/notify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../auth/storage/tokenStorage', () => ({ tokenStorage: { get: () => ({ accessToken: 't' }) } }));
vi.mock('../../services/http', () => ({ API_BASE_URL: '' }));

import { toast } from '../notifications/notify';
import { DownloadAllButton } from './DownloadAllButton';

function streamResponse(chunks: number[][], headers: Record<string, string>): Response {
  const body = new ReadableStream<Uint8Array>({
    start(c) { for (const ch of chunks) c.enqueue(new Uint8Array(ch)); c.close(); },
  });
  return { ok: true, status: 200, body, headers: new Headers(headers) } as unknown as Response;
}

beforeEach(() => {
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => 'blob:x');
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe('DownloadAllButton', () => {
  it('is disabled when there are no documents', () => {
    render(<DownloadAllButton caseId="c1" docCount={0} />);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.title).toBe('No files uploaded yet');
  });

  it('is enabled with no empty-state tooltip when files exist', () => {
    render(<DownloadAllButton caseId="c1" docCount={2} />);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.title).toBe('');
  });

  it('streams the ZIP, saves a blob, and toasts success — then returns to idle', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue(
      streamResponse([[1, 2], [3, 4]], { 'X-Total-Bytes': '4', 'Content-Disposition': 'attachment; filename="Acme-documents.zip"' }),
    ) as unknown as typeof fetch;

    render(<DownloadAllButton caseId="c1" docCount={3} />);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Documents downloaded'));
    expect(clickSpy).toHaveBeenCalled();
    expect((URL as unknown as { createObjectURL: ReturnType<typeof vi.fn> }).createObjectURL).toHaveBeenCalled();
    expect((URL as unknown as { revokeObjectURL: ReturnType<typeof vi.fn> }).revokeObjectURL).toHaveBeenCalled();
    expect(screen.getByRole('button').textContent).toContain('Download All'); // back to idle
  });

  it('toasts a clear error when the case has no documents (409)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 409, body: null, headers: new Headers() } as unknown as Response) as unknown as typeof fetch;
    render(<DownloadAllButton caseId="c1" docCount={3} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('This case has no documents to download.'));
  });
});
