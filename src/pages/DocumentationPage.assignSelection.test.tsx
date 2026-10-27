import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DocumentationPage } from './DocumentationPage';
import { documentationService } from '../services/documentation.service';
import { handoffService } from '../services/handoff.service';
import { api } from '../services/api';

const modalProps = vi.fn();
vi.mock('../components/leads/LeadAssignModal', () => ({
  LeadAssignModal: (p: any) => { modalProps(p); return <div data-testid="assign-modal" />; },
}));
vi.mock('../components/notifications/notify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../auth/context/AuthContext', () => ({ useAuth: () => ({ permissions: { can: () => false } }) }));
vi.mock('../services/documentation.service', () => ({
  documentationService: { listCases: vi.fn(), getDashboardKPIs: vi.fn(), listPresets: vi.fn() },
}));
vi.mock('../services/handoff.service', () => ({ handoffService: { getIncoming: vi.fn() } }));
vi.mock('../services/api', () => ({ api: { get: vi.fn() } }));

const mkCase = (id: string, leadId: string, company: string) => ({
  id, leadId, status: 'ACTIVE', completionPercent: 0, isReady: false, preset: null,
  lead: { id: leadId, firstName: 'F', lastName: 'L', company },
});

describe('DocumentationPage - case multi-select to Assign', () => {
  it('passes the selected cases lead ids and a DOCUMENTATION context (no departmentId) to the modal', async () => {
    vi.mocked(documentationService.listCases).mockResolvedValue(
      { data: [mkCase('c1', 'lead-1', 'Acme'), mkCase('c2', 'lead-2', 'Beta')], total: 2, page: 1, pageSize: 50 } as any,
    );
    vi.mocked(documentationService.getDashboardKPIs).mockResolvedValue({} as any);
    vi.mocked(documentationService.listPresets).mockResolvedValue([]);
    vi.mocked(handoffService.getIncoming).mockResolvedValue([]);
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } } as any);

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/documentation']}><DocumentationPage /></MemoryRouter>
      </QueryClientProvider>,
    );

    await user.click(await screen.findByLabelText('Select case Beta'));
    expect(screen.getByText('1 selected')).toBeTruthy();
    // checkbox click must not open the case detail panel
    expect(screen.queryByText('Case workspace')).toBeNull();

    await user.click(screen.getByRole('button', { name: /Assign/ }));
    expect(screen.getByTestId('assign-modal')).toBeTruthy();
    const p = modalProps.mock.calls.at(-1)![0];
    expect([...p.selectedIds]).toEqual(['lead-2']);
    expect(p.assignContext).toEqual({ kind: 'DOCUMENTATION' });
    expect(p.departmentId).toBeUndefined();
  });
});
