import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ComponentDocumentsPanel } from './ComponentDocumentsPanel';
import { caseConfigService } from '../../services/case-config.service';
import type { CaseTypeComponent, CaseTypeComponentDocument } from '../../types/caseConfig';

let granted: string[] = ['case-type:view', 'case-type:manage'];
vi.mock('../../auth/public', () => ({ useAuth: () => ({ permissions: { can: (p: string) => granted.includes(p) } }) }));
vi.mock('../../services/case-config.service', () => ({
  caseConfigService: {
    listComponentDocuments: vi.fn(),
    createComponentDocument: vi.fn(),
    updateComponentDocument: vi.fn(),
    deleteComponentDocument: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const svc = vi.mocked(caseConfigService);

const comp = (over: Partial<CaseTypeComponent> = {}): CaseTypeComponent => ({
  id: 'comp-1', tenantId: 't', caseTypeId: 'ct-1', name: 'Partnership Firm', description: null,
  isMandatory: false, displayOrder: 0, isActive: true, createdAt: '', updatedAt: '', deletedAt: null, ...over,
});
const doc = (over: Partial<CaseTypeComponentDocument> = {}): CaseTypeComponentDocument => ({
  id: 'cd-1', tenantId: 't', caseTypeId: 'ct-1', componentId: 'comp-1', name: 'PAN', dedupeKey: 'pan',
  description: null, isMandatory: false, displayOrder: 0, isActive: true, createdAt: '', updatedAt: '', deletedAt: null, ...over,
});

function renderPanel(opts: { component?: CaseTypeComponent; disabled?: boolean } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={qc}>
      <ComponentDocumentsPanel caseTypeId="ct-1" component={opts.component ?? comp()} disabled={opts.disabled} />
    </QueryClientProvider>,
  );
  return { qc, ...utils };
}

beforeEach(() => {
  vi.clearAllMocks();
  granted = ['case-type:view', 'case-type:manage'];
  svc.listComponentDocuments.mockResolvedValue([]);
  svc.createComponentDocument.mockResolvedValue(doc());
  svc.updateComponentDocument.mockResolvedValue(doc());
  svc.deleteComponentDocument.mockResolvedValue({});
});

describe('ComponentDocumentsPanel', () => {
  it('lists the component documents', async () => {
    svc.listComponentDocuments.mockResolvedValue([doc({ name: 'PAN', isMandatory: true }), doc({ id: 'cd-2', name: 'GST Certificate', dedupeKey: 'gst certificate' })]);
    renderPanel();
    expect(await screen.findByText('PAN')).toBeInTheDocument();
    expect(screen.getByText('GST Certificate')).toBeInTheDocument();
    expect(screen.getByText('mandatory')).toBeInTheDocument();
  });

  it('shows the empty state explaining a component with no documents creates nothing', async () => {
    renderPanel();
    expect(await screen.findByText(/No documents yet/)).toBeInTheDocument();
  });

  it('adding a document posts the payload and invalidates the component-documents prefix', async () => {
    const { qc } = renderPanel();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    await screen.findByText(/No documents yet/);

    await userEvent.type(screen.getByLabelText('Document name'), 'PAN');
    await userEvent.click(screen.getByRole('button', { name: /Add document/ }));

    await waitFor(() => expect(svc.createComponentDocument).toHaveBeenCalledWith('ct-1', 'comp-1', expect.objectContaining({ name: 'PAN' })));
    await waitFor(() => {
      const keys = invalidate.mock.calls.map(c => JSON.stringify((c[0] as any)?.queryKey));
      expect(keys).toContain(JSON.stringify(['case-types', 'ct-1', 'components', 'comp-1', 'documents']));
    });
  });

  it('archive and reactivate send isActive', async () => {
    svc.listComponentDocuments.mockResolvedValue([doc({ isActive: true })]);
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(svc.updateComponentDocument).toHaveBeenCalledWith('ct-1', 'comp-1', 'cd-1', { isActive: false }));

    vi.clearAllMocks();
    svc.listComponentDocuments.mockResolvedValue([doc({ isActive: false })]);
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Reactivate' }));
    await waitFor(() => expect(svc.updateComponentDocument).toHaveBeenCalledWith('ct-1', 'comp-1', 'cd-1', { isActive: true }));
  });

  it('a duplicate-key (409) error from the API surfaces via the mutation toast', async () => {
    const { toast } = await import('sonner');
    svc.createComponentDocument.mockRejectedValue({ response: { data: { message: 'An active document with key "pan" already exists on this component.' } } });
    renderPanel();
    await screen.findByText(/No documents yet/);
    await userEvent.type(screen.getByLabelText('Document name'), 'PAN');
    await userEvent.click(screen.getByRole('button', { name: /Add document/ }));
    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalledWith(expect.stringContaining('already exists')));
  });

  it('offers no write actions for an archived component, or an archived case type, or a viewer', async () => {
    svc.listComponentDocuments.mockResolvedValue([doc()]);

    // archived component
    renderPanel({ component: comp({ isActive: false }) });
    expect(await screen.findByText('PAN')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add document/ })).toBeNull();
    expect(screen.getByText(/This component is archived/)).toBeInTheDocument();

    // archived case type
    vi.clearAllMocks();
    svc.listComponentDocuments.mockResolvedValue([doc()]);
    renderPanel({ disabled: true });
    expect(await screen.findByText('PAN')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add document/ })).toBeNull();

    // viewer without manage
    vi.clearAllMocks();
    granted = ['case-type:view'];
    svc.listComponentDocuments.mockResolvedValue([doc()]);
    renderPanel();
    expect(await screen.findByText('PAN')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add document/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();
  });

  it('Delete after confirm calls the mutation with the right ids; Cancel makes no call', async () => {
    svc.listComponentDocuments.mockResolvedValue([doc()]);
    const confirm = vi.spyOn(window, 'confirm');
    renderPanel();
    const btn = await screen.findByRole('button', { name: 'Delete PAN' });

    confirm.mockReturnValueOnce(false);
    await userEvent.click(btn);
    expect(confirm).toHaveBeenCalledWith('Delete this document? It will also be removed from any existing cases it is currently attached to.');
    expect(svc.deleteComponentDocument).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    await userEvent.click(btn);
    await waitFor(() => expect(svc.deleteComponentDocument).toHaveBeenCalledWith('ct-1', 'comp-1', 'cd-1'));
    confirm.mockRestore();
  });

  it('with multiple rows, each row Delete sends that row own id', async () => {
    svc.listComponentDocuments.mockResolvedValue([doc({ id: 'cd-1', name: 'PAN' }), doc({ id: 'cd-2', name: 'GST Certificate', dedupeKey: 'gst' })]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPanel();

    await userEvent.click(await screen.findByRole('button', { name: 'Delete GST Certificate' }));
    await waitFor(() => expect(svc.deleteComponentDocument).toHaveBeenLastCalledWith('ct-1', 'comp-1', 'cd-2'));

    await userEvent.click(screen.getByRole('button', { name: 'Delete PAN' }));
    await waitFor(() => expect(svc.deleteComponentDocument).toHaveBeenLastCalledWith('ct-1', 'comp-1', 'cd-1'));
    confirm.mockRestore();
  });

  it('disables the Delete button while the delete mutation is pending (no double-submit)', async () => {
    svc.listComponentDocuments.mockResolvedValue([doc()]);
    let resolve: (v?: unknown) => void = () => {};
    svc.deleteComponentDocument.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPanel();
    const btn = await screen.findByRole('button', { name: 'Delete PAN' });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    await waitFor(() => expect(btn).toBeDisabled());
    resolve();
    confirm.mockRestore();
  });

  it('Delete is absent without case-type:manage, and for an archived component or case type', async () => {
    svc.listComponentDocuments.mockResolvedValue([doc()]);

    granted = ['case-type:view'];
    const a = renderPanel();
    expect(await screen.findByText('PAN')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
    a.unmount();

    granted = ['case-type:view', 'case-type:manage'];
    const b = renderPanel({ component: comp({ isActive: false }) });
    expect(await screen.findByText('PAN')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
    b.unmount();

    renderPanel({ disabled: true });
    expect(await screen.findByText('PAN')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
  });
});
