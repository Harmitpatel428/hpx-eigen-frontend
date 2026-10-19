import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProcessQueuePage } from './ProcessQueuePage';
import { processService } from '../services/process.service';

let granted: string[] = [];
vi.mock('../auth/context/AuthContext', () => ({
  useAuth: () => ({ permissions: { can: (s: string) => granted.includes(s) } }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../services/documentation.service', () => ({
  documentationService: {
    getDashboardKPIs: vi.fn().mockResolvedValue({ pendingProcessReview: 4, transferredCases: 7, returnedToDocumentation: 2 }),
  },
}));
vi.mock('../services/process.service', () => ({
  processService: {
    listIncoming: vi.fn(),
    accept: vi.fn().mockResolvedValue({}),
    returnToDocumentation: vi.fn().mockResolvedValue({}),
  },
}));

const aCase = {
  id: 'c1',
  caseNumber: 'HPX-0001-0001',
  lead: { id: 'l1', firstName: 'Asha', lastName: 'Rao', company: 'Rao Exports' },
  preset: { id: 'p1', name: 'GST Registration' },
  processHandoffAt: '2026-10-01T10:00:00.000Z',
  processHandoffBy: 'doc-user',
  handoverRemarks: 'All originals verified',
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><ProcessQueuePage /></MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  // Modal focuses its first control inside rAF; run it synchronously for determinism.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0; });
  vi.mocked(processService.listIncoming).mockResolvedValue([aCase] as never);
  granted = ['process:view', 'process:accept', 'process:return'];
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('ProcessQueuePage', () => {
  it('shows Incoming / Processing / Returned counts and the queue row', async () => {
    renderPage();
    expect(await screen.findByText('HPX-0001-0001')).toBeTruthy();
    expect(screen.getByText('GST Registration')).toBeTruthy();
    expect(screen.getByText('All originals verified')).toBeTruthy();
    for (const [label, n] of [['Incoming', '4'], ['Processing', '7'], ['Returned', '2']]) {
      const tile = screen.getByText(label).parentElement!;
      await waitFor(() => expect(tile.textContent).toContain(n));
    }
  });

  describe('row actions follow permissions', () => {
    it('shows Accept and Return when granted', async () => {
      renderPage();
      expect(await screen.findByRole('button', { name: 'Accept' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Return' })).toBeTruthy();
    });

    it('hides Accept and Return when not granted', async () => {
      granted = ['process:view'];
      renderPage();
      await screen.findByText('HPX-0001-0001');
      expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Return' })).toBeNull();
    });

    it('Accept calls the service with the case id', async () => {
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
      await waitFor(() => expect(processService.accept).toHaveBeenCalledWith('c1'));
    });
  });

  describe('return dialog (client-side mirror of checkReturnReason)', () => {
    const openDialog = async () => {
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Return' }));
      const confirm = screen.getByRole('button', { name: 'Return to Documentation' }) as HTMLButtonElement;
      const reason = screen.getByLabelText('Reason') as HTMLSelectElement;
      const note = screen.getByLabelText(/Note/) as HTMLTextAreaElement;
      return { confirm, reason, note };
    };

    it('disables confirm for OTHER with an empty note', async () => {
      const { confirm, reason } = await openDialog();
      fireEvent.change(reason, { target: { value: 'OTHER' } });
      expect(confirm.disabled).toBe(true);
    });

    it('treats a whitespace-only note as empty for OTHER', async () => {
      const { confirm, reason, note } = await openDialog();
      fireEvent.change(reason, { target: { value: 'OTHER' } });
      fireEvent.change(note, { target: { value: '   ' } });
      expect(confirm.disabled).toBe(true);
    });

    it('enables confirm for OTHER once a note is entered', async () => {
      const { confirm, reason, note } = await openDialog();
      fireEvent.change(reason, { target: { value: 'OTHER' } });
      fireEvent.change(note, { target: { value: 'Needs a call with the client' } });
      expect(confirm.disabled).toBe(false);
    });

    it('enables confirm for a non-OTHER reason with an empty note, and submits it', async () => {
      const { confirm, reason } = await openDialog();
      fireEvent.change(reason, { target: { value: 'DATA_MISMATCH' } });
      expect(confirm.disabled).toBe(false);
      fireEvent.click(confirm);
      await waitFor(() =>
        expect(processService.returnToDocumentation).toHaveBeenCalledWith('c1', 'DATA_MISMATCH', ''));
    });
  });
});
