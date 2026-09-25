import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeadNotesSummary } from './LeadNotesSummary';
import { LeadNotesModal } from './LeadNotesModal';

/**
 * Single-source-of-truth contract for the Notes surfaces.
 *
 * Root cause this guards against: LeadNotesSummary (in LeadDetailPanel) used to fall back to the
 * legacy free-text `lead.notes` string whenever the notes table was empty, so the panel showed a
 * "note" the modal (which only reads the notes table) knew nothing about. Both surfaces now derive
 * from the same notes table, keyed by leadId, and are invalidated together on every mutation.
 */

const h = vi.hoisted(() => {
  const store: Record<string, any[]> = {}; // per-lead, newest-first (server order: createdAt desc)
  const state = { failCreate: false };
  let seq = 0;
  const mkNote = (leadId: string, content: string, source = 'user') => {
    seq += 1;
    const iso = new Date(Date.now() + seq * 1000).toISOString();
    return {
      id: `n${seq}`, leadId, tenantId: 't', authorId: 'u', content, source,
      followUpDate: null, followUpTime: null, createdAt: iso, updatedAt: iso, deletedAt: null,
    };
  };
  return { store, state, mkNote };
});

vi.mock('../../services/lead-notes.service', () => ({
  leadNotesKeys: {
    list: (leadId: string) => ['notes', leadId],
    summary: (leadId: string) => ['notes-summary', leadId],
  },
  invalidateLeadNotes: (qc: any, leadId: string) => {
    qc.invalidateQueries({ queryKey: ['notes', leadId] });
    qc.invalidateQueries({ queryKey: ['notes-summary', leadId] });
  },
  leadNotesService: {
    summary: vi.fn(async (leadId: string) => {
      const arr = h.store[leadId] ?? [];
      return { count: arr.length, latest: arr[0] ?? null };
    }),
    list: vi.fn(async (leadId: string) => [...(h.store[leadId] ?? [])]),
    create: vi.fn(async (leadId: string, p: { content: string }) => {
      if (h.state.failCreate) throw new Error('save failed');
      const note = h.mkNote(leadId, p.content);
      h.store[leadId] = [note, ...(h.store[leadId] ?? [])];
      return note;
    }),
    delete: vi.fn(async (leadId: string, noteId: string) => {
      h.store[leadId] = (h.store[leadId] ?? []).filter(n => n.id !== noteId);
    }),
    update: vi.fn(),
  },
}));

function Harness({ leadId, legacyNote }: { leadId: string; legacyNote?: string }) {
  // Both surfaces mounted together, sharing one QueryClient — mirrors LeadDetailPanel with the
  // modal open on top of it.
  //
  // `legacyNote` is spread through as `any` on purpose: post-fix the prop no longer exists, but the
  // pre-fix component read it. Passing it here proves the summary never surfaces a lead's legacy
  // free-text as a note — the test fails against the pre-fix code (which rendered it) and passes now.
  return (
    <>
      <LeadNotesSummary leadId={leadId} onOpen={() => {}} {...({ legacyNote } as any)} />
      <LeadNotesModal leadId={leadId} leadName="Acme Corp" onClose={() => {}} anchorRight={480} />
    </>
  );
}

function renderHarness(leadId: string, legacyNote?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Harness leadId={leadId} legacyNote={legacyNote} />
    </QueryClientProvider>,
  );
}

// Content that both surfaces render is present at least twice (panel preview + modal list).
async function bothShow(text: string) {
  // Both surfaces render the same text (panel preview + modal list) — wait until BOTH have it.
  await waitFor(
    () => expect(screen.getAllByText(text).length).toBeGreaterThanOrEqual(2),
    { timeout: 3000 },
  );
}

beforeEach(() => {
  for (const k of Object.keys(h.store)) delete h.store[k];
  h.state.failCreate = false;
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('LeadNotes single source of truth', () => {
  it('[a] an existing persisted note is visible in BOTH panel and modal on open', async () => {
    h.store['lead-1'] = [h.mkNote('lead-1', 'Original note')];
    renderHarness('lead-1');
    await bothShow('Original note');
    // Panel count reflects the persisted count, not a legacy string.
    expect(await screen.findByText('View all 1 note →')).toBeTruthy();
  });

  it('[b] adding a note shows it as latest on BOTH, list keeps the original, count 2', async () => {
    h.store['lead-1'] = [h.mkNote('lead-1', 'Original note')];
    const user = userEvent.setup();
    renderHarness('lead-1');
    await bothShow('Original note');

    await user.click(await screen.findByLabelText('Add note'));
    await user.type(screen.getByPlaceholderText('Write your note…'), 'Second note');
    await user.click(screen.getByText('Save'));

    await bothShow('Second note');            // new latest on both surfaces (panel preview + modal)
    // Original did NOT vanish: it remains in the modal's full list, and the panel count is now 2.
    expect(screen.getByText('Original note')).toBeTruthy();
    expect(await screen.findByText('View all 2 notes →')).toBeTruthy();
  });

  it('[c] deleting the latest note makes BOTH fall back to the previous note', async () => {
    h.store['lead-1'] = [h.mkNote('lead-1', 'Second note'), h.mkNote('lead-1', 'Original note')];
    const user = userEvent.setup();
    renderHarness('lead-1');
    await bothShow('Second note');

    // Modal lists newest-first, so the first Delete button belongs to "Second note".
    await user.click((await screen.findAllByText('Delete'))[0]);

    await waitFor(() => expect(screen.queryByText('Second note')).toBeNull());
    await bothShow('Original note');
    expect(await screen.findByText('View all 1 note →')).toBeTruthy();
  });

  it('[d] deleting all notes shows the empty state on BOTH surfaces', async () => {
    h.store['lead-1'] = [h.mkNote('lead-1', 'Only note')];
    const user = userEvent.setup();
    renderHarness('lead-1');
    await bothShow('Only note');

    await user.click((await screen.findAllByText('Delete'))[0]);

    await waitFor(() => expect(screen.getAllByText('No notes yet.').length).toBeGreaterThanOrEqual(2));
    expect(screen.getByText('Manage notes →')).toBeTruthy();
  });

  it('[e] switching leads never leaks another lead\'s notes', async () => {
    h.store['lead-1'] = [h.mkNote('lead-1', 'Lead one note')];
    h.store['lead-2'] = [h.mkNote('lead-2', 'Lead two note')];

    renderHarness('lead-1');
    await bothShow('Lead one note');
    expect(screen.queryByText('Lead two note')).toBeNull();

    cleanup();

    renderHarness('lead-2');
    await bothShow('Lead two note');
    expect(screen.queryByText('Lead one note')).toBeNull();
  });

  it('[f] a failed create leaves BOTH surfaces consistent with the server', async () => {
    h.store['lead-1'] = [h.mkNote('lead-1', 'Original note')];
    h.state.failCreate = true;
    const user = userEvent.setup();
    renderHarness('lead-1');
    await bothShow('Original note');

    await user.click(await screen.findByLabelText('Add note'));
    await user.type(screen.getByPlaceholderText('Write your note…'), 'Doomed note');
    await user.click(screen.getByText('Save'));

    await screen.findByText('save failed');            // error surfaced, draft kept in the form
    // Neither surface gained a persisted note: server truth (1 note) is intact on both.
    await bothShow('Original note');
    expect(screen.getByText('View all 1 note →')).toBeTruthy();
    expect(screen.queryByText('View all 2 notes →')).toBeNull();
  });

  // F1 — the regression this whole change exists for. FAILS against the pre-fix code (which rendered
  // the legacy lead.notes string as a note when the table was empty); passes now.
  it('[legacy] a legacy lead.notes string is NEVER rendered as a note; the table is the only source', async () => {
    h.store['lead-legacy'] = []; // legacy free-text exists on the lead, but NO leadNote rows
    const user = userEvent.setup();
    renderHarness('lead-legacy', 'Legacy free-text');

    // On load: both surfaces show the empty state; the legacy string is nowhere.
    await waitFor(() => expect(screen.getAllByText('No notes yet.').length).toBeGreaterThanOrEqual(2));
    expect(screen.queryByText('Legacy free-text')).toBeNull();
    expect(screen.getByText('Manage notes →')).toBeTruthy();

    // Add a real row-note → both surfaces show it; legacy text still absent.
    await user.click(await screen.findByLabelText('Add note'));
    await user.type(screen.getByPlaceholderText('Write your note…'), 'Real note');
    await user.click(screen.getByText('Save'));
    await bothShow('Real note');
    expect(screen.queryByText('Legacy free-text')).toBeNull();

    // Delete it → both return to the empty state; the legacy text does NOT reappear.
    await user.click((await screen.findAllByText('Delete'))[0]);
    await waitFor(() => expect(screen.getAllByText('No notes yet.').length).toBeGreaterThanOrEqual(2));
    expect(screen.queryByText('Legacy free-text')).toBeNull();
  });

  // P6 — a migrated (source='legacy_backfill') note renders as "Migrated", never "You".
  it('[migrated] backfilled notes render a "Migrated" author, not "You"', async () => {
    h.store['lead-m'] = [h.mkNote('lead-m', 'Migrated note', 'legacy_backfill')];
    renderHarness('lead-m');
    await waitFor(() => expect(screen.getByText('Migrated note')).toBeTruthy());
    // The modal's note row shows the "Migrated" author label…
    expect(screen.getByText(/Migrated · /)).toBeTruthy();
    // …and never the default "You" author for this row.
    expect(screen.queryByText(/You · /)).toBeNull();
  });
});
