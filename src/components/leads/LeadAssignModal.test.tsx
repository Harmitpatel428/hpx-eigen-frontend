import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeadAssignModal } from './LeadAssignModal';
import { leadService } from '../../services/lead.service';
import { userService } from '../../services/user.service';
import { permissionService } from '../../services/permission.service';

vi.mock('../notifications/notify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../services/lead.service', () => ({
  leadService: { getDocumentationAssignees: vi.fn(), bulkAssign: vi.fn(), previewAutoAssign: vi.fn() },
}));
vi.mock('../../services/user.service', () => ({ userService: { listAll: vi.fn() } }));
vi.mock('../../services/permission.service', () => ({ permissionService: { getDepartments: vi.fn() } }));

const ids = new Set(['lead-1', 'lead-2']);

function renderModal(props: Partial<React.ComponentProps<typeof LeadAssignModal>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LeadAssignModal selectedIds={ids} onSuccess={vi.fn()} onClose={vi.fn()} {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(leadService.bulkAssign).mockResolvedValue({ count: 2 });
  vi.mocked(permissionService.getDepartments).mockResolvedValue([{ id: 'sales-dept', name: 'Sales' }] as any);
  vi.mocked(userService.listAll).mockResolvedValue([
    { id: 'u-active', email: 'active@x.com', firstName: 'Ann', lastName: 'Active', status: 'ACTIVE', createdAt: '' },
    { id: 'u-off', email: 'off@x.com', firstName: 'Ola', lastName: 'Off', status: 'INACTIVE', createdAt: '' },
  ] as any);
});

describe('LeadAssignModal - Sales path (no assignContext) is unchanged', () => {
  it('lists active tenant users via userService.listAll and never calls the documentation endpoint', async () => {
    const user = userEvent.setup();
    renderModal();
    expect(await screen.findByText('Ann Active')).toBeTruthy();
    expect(screen.queryByText('Ola Off')).toBeNull();
    expect(userService.listAll).toHaveBeenCalledTimes(1);
    expect(permissionService.getDepartments).toHaveBeenCalledTimes(1);
    expect(leadService.getDocumentationAssignees).not.toHaveBeenCalled();

    await user.click(screen.getByText('Ann Active'));
    await user.click(screen.getByRole('button', { name: /Assign 2 Leads/ }));
    await waitFor(() => expect(leadService.bulkAssign).toHaveBeenCalledWith({ leadIds: ['lead-1', 'lead-2'], mode: 'MANUAL', userId: 'u-active' }));
  });

  it('AUTO uses the free department picker', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Auto Assign' }));
    const select = await screen.findByRole('combobox');
    await screen.findByRole('option', { name: 'Sales' });
    await user.selectOptions(select, 'sales-dept');
    await user.click(screen.getByRole('button', { name: /Auto Assign 2 Leads/ }));
    await waitFor(() => expect(leadService.bulkAssign).toHaveBeenCalledWith({ leadIds: ['lead-1', 'lead-2'], mode: 'AUTO', departmentId: 'sales-dept' }));
    expect(leadService.getDocumentationAssignees).not.toHaveBeenCalled();
  });
});

describe('LeadAssignModal - Documentation context', () => {
  const ctx = { kind: 'DOCUMENTATION' as const };

  it('MANUAL pool is the endpoint users (not userService.listAll); confirm sends MANUAL userId', async () => {
    vi.mocked(leadService.getDocumentationAssignees).mockResolvedValue({
      departmentId: 'doc-dept',
      users: [{ id: 'd1', firstName: 'Dora', lastName: 'Doc', email: 'dora@x.com' }],
    });
    const user = userEvent.setup();
    renderModal({ assignContext: ctx });
    await user.click(await screen.findByText('Dora Doc'));
    expect(screen.queryByText('Ann Active')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Assign 2 Leads/ }));
    await waitFor(() => expect(leadService.bulkAssign).toHaveBeenCalledWith({ leadIds: ['lead-1', 'lead-2'], mode: 'MANUAL', userId: 'd1' }));
    expect(userService.listAll).not.toHaveBeenCalled();
    expect(permissionService.getDepartments).not.toHaveBeenCalled();
  });

  it('empty pool shows the inline message and keeps Confirm disabled', async () => {
    vi.mocked(leadService.getDocumentationAssignees).mockResolvedValue({ departmentId: 'doc-dept', users: [] });
    renderModal({ assignContext: ctx });
    expect(await screen.findByText('No assignable users in the Documentation department.')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Assign 2 Leads/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('AUTO is locked to the fetched departmentId (no picker) and confirm sends it', async () => {
    vi.mocked(leadService.getDocumentationAssignees).mockResolvedValue({ departmentId: 'doc-dept', users: [] });
    const user = userEvent.setup();
    renderModal({ assignContext: ctx });
    await user.click(screen.getByRole('button', { name: 'Auto Assign' }));
    expect(await screen.findByText(/within the Documentation department/)).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Auto Assign 2 Leads/ }));
    await waitFor(() => expect(leadService.bulkAssign).toHaveBeenCalledWith({ leadIds: ['lead-1', 'lead-2'], mode: 'AUTO', departmentId: 'doc-dept' }));
  });

  it('departmentId null disables AUTO with an inline note', async () => {
    vi.mocked(leadService.getDocumentationAssignees).mockResolvedValue({ departmentId: null, users: [] });
    const user = userEvent.setup();
    renderModal({ assignContext: ctx });
    await user.click(screen.getByRole('button', { name: 'Auto Assign' }));
    expect(await screen.findByText(/Auto assign is unavailable/)).toBeTruthy();
    expect((screen.getByRole('button', { name: /Auto Assign 2 Leads/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows an error state when the endpoint fails', async () => {
    vi.mocked(leadService.getDocumentationAssignees).mockRejectedValue(new Error('boom'));
    renderModal({ assignContext: ctx });
    expect(await screen.findByText('Failed to load Documentation users.')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Assign 2 Leads/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
