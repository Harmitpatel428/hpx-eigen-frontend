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
vi.mock('../components/notifications/notify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../services/process.service', () => ({
  processKeys: {
    cases: (p = {}) => ['process-cases', p],
    case: (id: string) => ['process-case', id],
    dashboard: () => ['process-dashboard'],
  },
  processService: {
    listCases: vi.fn(),
    getDashboard: vi.fn(),
    getCase: vi.fn().mockResolvedValue({}),
    accept: vi.fn().mockResolvedValue({}),
    assignCase: vi.fn().mockResolvedValue({}),
    returnToDocumentation: vi.fn().mockResolvedValue({}),
  },
}));

const aCase = {
  id: 'c1',
  caseNumber: 'HPX-0001-0001',
  status: 'PENDING_PROCESS_REVIEW',
  lead: { id: 'l1', firstName: 'Asha', lastName: 'Rao', company: 'Rao Exports' },
  assignedUser: { id: 'u9', firstName: 'Jane', lastName: 'Advisor' },
};

const COUNTS = { incoming: 4, processing: 7, returned: 2, overdue: 1 };

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><ProcessQueuePage /></MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0; });
  vi.mocked(processService.listCases).mockResolvedValue({ cases: [aCase], counts: COUNTS } as never);
  vi.mocked(processService.getDashboard).mockResolvedValue(COUNTS as never);
  granted = ['process:view', 'process:accept', 'process:return', 'process:assign'];
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('ProcessQueuePage', () => {
  it('shows KPI tiles and the queue row', async () => {
    renderPage();
    expect(await screen.findByText('Rao Exports')).toBeTruthy();
    expect(screen.getByText(/HPX-0001-0001/)).toBeTruthy();
    for (const [label, n] of [['incoming', '4'], ['processing', '7'], ['returned', '2'], ['overdue', '1']]) {
      await waitFor(() => expect(screen.getByTestId(`kpi-${label}`).textContent).toContain(n));
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
      await screen.findByText('Rao Exports');
      expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Return' })).toBeNull();
    });

    it('maps Accept to process:accept only (Return hidden)', async () => {
      granted = ['process:view', 'process:accept'];
      renderPage();
      expect(await screen.findByRole('button', { name: 'Accept' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Return' })).toBeNull();
    });

    it('maps Return to process:return only (Accept hidden)', async () => {
      granted = ['process:view', 'process:return'];
      renderPage();
      expect(await screen.findByRole('button', { name: 'Return' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    });

    it('Accept calls the service with the case id', async () => {
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
      await waitFor(() => expect(processService.accept).toHaveBeenCalledWith('c1'));
    });
  });

  describe('failure handling', () => {
    it('shows an error state, not the empty-queue message, when the list fails to load', async () => {
      vi.mocked(processService.listCases).mockRejectedValue({ response: { status: 403, data: { message: 'Forbidden' } } });
      renderPage();
      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toContain('Forbidden');
      expect(screen.queryByText('No cases in this view.')).toBeNull();
    });

    it('shows "—" tiles when the dashboard counts fail to load', async () => {
      vi.mocked(processService.getDashboard).mockRejectedValue({ response: { status: 403, data: { message: 'Nope' } } });
      renderPage();
      await screen.findByText('Rao Exports');
      await waitFor(() => expect(screen.getByTestId('kpi-incoming').textContent).toContain('—'));
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
