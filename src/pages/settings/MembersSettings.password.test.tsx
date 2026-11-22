/**
 * RED TEAM — Settings → Members → Change Password wiring.
 * Attacks the row→modal→submit path: wrong/stale target, self-targeting,
 * duplicate submissions, in-flight disable.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MembersSettings } from './MembersSettings';
import { userService } from '../../services/user.service';
import { permissionService } from '../../services/permission.service';

const ADMIN_ID = 'admin-1';

vi.mock('../../auth/public', () => ({
  useAuth: () => ({
    permissions: { can: () => true },
    user: { id: ADMIN_ID, email: 'admin@test.local' },
  }),
}));
vi.mock('../../services/user.service', () => ({
  userService: { listAll: vi.fn(), setMemberPassword: vi.fn() },
}));
vi.mock('../../services/permission.service', () => ({
  permissionService: { getRoles: vi.fn(), assignUserRole: vi.fn() },
}));

const MEMBERS = [
  { id: ADMIN_ID, email: 'admin@test.local', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z', userRoles: [] },
  { id: 'member-a', email: 'alice@test.local', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z', userRoles: [] },
  { id: 'member-b', email: 'bob@test.local', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z', userRoles: [] },
];

const STRONG = 'Zq7#Strongpass!';

function renderMembers() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MembersSettings />
    </QueryClientProvider>,
  );
}

/** The row whose member email is `email` (the grid container holding that row's cells). */
function rowFor(email: string): HTMLElement {
  return screen.getByText(email).closest('div[style*="grid"]') as HTMLElement;
}

async function openPasswordModalFor(email: string) {
  const user = userEvent.setup();
  const btn = within(rowFor(email)).getByTitle('Set a new password for this member');
  await user.click(btn);
  return user;
}

/** Fill both password fields in the open modal. */
async function fillPasswords(user: ReturnType<typeof userEvent.setup>, pw: string) {
  const inputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]');
  expect(inputs.length).toBe(2);
  await user.type(inputs[0], pw);
  await user.type(inputs[1], pw);
}

beforeEach(() => {
  vi.clearAllMocks();
  (userService.listAll as any).mockResolvedValue(MEMBERS);
  (permissionService.getRoles as any).mockResolvedValue([]);
  (userService.setMemberPassword as any).mockResolvedValue({ sessionsRevoked: 1 });
});

describe('RED TEAM — Change Password target wiring', () => {
  it('submits the SELECTED member id — never the signed-in admin id', async () => {
    renderMembers();
    await screen.findByText('bob@test.local');

    const user = await openPasswordModalFor('bob@test.local');
    await fillPasswords(user, STRONG);
    await user.click(screen.getByText('Update Password'));

    await waitFor(() => expect(userService.setMemberPassword).toHaveBeenCalledTimes(1));
    expect(userService.setMemberPassword).toHaveBeenCalledWith('member-b', STRONG);
    // The acting admin's id must never be the target.
    expect(userService.setMemberPassword).not.toHaveBeenCalledWith(ADMIN_ID, expect.anything());
  });

  it('switching the selected member before submitting uses the NEW target (no stale id)', async () => {
    renderMembers();
    await screen.findByText('alice@test.local');

    // Open A, back out, then open B and submit.
    let user = await openPasswordModalFor('alice@test.local');
    await user.click(screen.getByText('Cancel'));

    user = await openPasswordModalFor('bob@test.local');
    await fillPasswords(user, STRONG);
    await user.click(screen.getByText('Update Password'));

    await waitFor(() => expect(userService.setMemberPassword).toHaveBeenCalledTimes(1));
    expect(userService.setMemberPassword).toHaveBeenCalledWith('member-b', STRONG);
    expect(userService.setMemberPassword).not.toHaveBeenCalledWith('member-a', expect.anything());
  });

  it('no Change Password action on the signed-in admin own row (self excluded)', async () => {
    renderMembers();
    await screen.findByText('admin@test.local');

    expect(within(rowFor('admin@test.local')).queryByTitle('Set a new password for this member')).toBeNull();
    expect(within(rowFor('alice@test.local')).getByTitle('Set a new password for this member')).toBeTruthy();
  });

  it('duplicate rapid clicks fire exactly ONE mutation and the button is disabled in flight', async () => {
    let release!: (v: unknown) => void;
    (userService.setMemberPassword as any).mockReturnValue(new Promise((res) => { release = res; }));

    renderMembers();
    await screen.findByText('bob@test.local');

    const user = await openPasswordModalFor('bob@test.local');
    await fillPasswords(user, STRONG);

    const submit = screen.getByText('Update Password').closest('button')!;
    await user.click(submit);
    await user.click(submit); // second click while the first is in flight
    await user.click(submit);

    expect(userService.setMemberPassword).toHaveBeenCalledTimes(1);
    // jest-dom matchers aren't configured in this vitest setup — assert the DOM property.
    expect(submit.disabled).toBe(true);

    release({ sessionsRevoked: 1 });
    await waitFor(() => expect(screen.getByText(/Password updated/i)).toBeTruthy());
  });

  it('client-side policy blocks a short password before any API call', async () => {
    renderMembers();
    await screen.findByText('bob@test.local');

    const user = await openPasswordModalFor('bob@test.local');
    await fillPasswords(user, 'Short1!');
    await user.click(screen.getByText('Update Password'));

    expect(userService.setMemberPassword).not.toHaveBeenCalled();
    // Exact error text — the static requirements hint also mentions "12 characters".
    expect(screen.getByText('Password must be at least 12 characters.')).toBeTruthy();
  });

  it('surfaces a server rejection instead of claiming success', async () => {
    (userService.setMemberPassword as any).mockRejectedValue({
      response: { data: { message: 'Forbidden' } },
    });

    renderMembers();
    await screen.findByText('bob@test.local');

    const user = await openPasswordModalFor('bob@test.local');
    await fillPasswords(user, STRONG);
    await user.click(screen.getByText('Update Password'));

    await waitFor(() => expect(screen.getByText('Forbidden')).toBeTruthy());
    expect(screen.queryByText(/Password updated/i)).toBeNull();
  });

  it('Enter in the confirm field submits ONE mutation for the selected member', async () => {
    renderMembers();
    await screen.findByText('bob@test.local');

    const user = await openPasswordModalFor('bob@test.local');
    await fillPasswords(user, STRONG);

    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]');
    await user.type(inputs[1], '{Enter}');

    await waitFor(() => expect(userService.setMemberPassword).toHaveBeenCalledTimes(1));
    expect(userService.setMemberPassword).toHaveBeenCalledWith('member-b', STRONG);
    expect(userService.setMemberPassword).not.toHaveBeenCalledWith(ADMIN_ID, expect.anything());
  });
});
