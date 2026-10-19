import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransferToProcessDialog } from './DocumentationPage';
import type { DocCase } from '../types';

// Modal runs its focus-on-open in a requestAnimationFrame; run it synchronously (see Modal.test.tsx).
beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0; });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const docCase = {
  id: 'case-1',
  caseNumber: 'HPX-0001-0001',
  completionPercent: 100,
  isReady: true,
  caseType: { id: 'ct-1', name: 'Export Licence' },
  preset: null,
  lead: { id: 'lead-1', firstName: 'Test', lastName: 'Lead', company: 'Acme Inc' },
} as unknown as DocCase;

function renderDialog(over: Partial<React.ComponentProps<typeof TransferToProcessDialog>> = {}) {
  const props = { docCase, preparedBy: 'Dana Doc', onClose: vi.fn(), onConfirm: vi.fn(), submitting: false, ...over };
  render(<TransferToProcessDialog {...props} />);
  return props;
}

const remarksBox = () => screen.getByLabelText(/Remarks for Process/) as HTMLTextAreaElement;

describe('TransferToProcessDialog', () => {
  it('shows the read-only case summary', () => {
    renderDialog();
    expect(screen.getByText('HPX-0001-0001')).toBeInTheDocument();
    expect(screen.getByText('Acme Inc · Test Lead')).toBeInTheDocument();
    expect(screen.getByText('Export Licence')).toBeInTheDocument();
    expect(screen.getByText('100% complete · Ready')).toBeInTheDocument();
    expect(screen.getByText('Dana Doc')).toBeInTheDocument();
  });

  it('remarks counter tracks typing and the textarea is capped at 2000', async () => {
    renderDialog();
    expect(screen.getByText('0/2000')).toBeInTheDocument();
    expect(remarksBox().maxLength).toBe(2000);

    await userEvent.type(remarksBox(), 'hello');
    expect(screen.getByText('5/2000')).toBeInTheDocument();

    // a paste beyond the cap is truncated by maxLength, so the counter never exceeds 2000
    await userEvent.clear(remarksBox());
    await userEvent.click(remarksBox());
    await userEvent.paste('x'.repeat(2500));
    expect(remarksBox().value).toHaveLength(2000);
    expect(screen.getByText('2000/2000')).toBeInTheDocument();
  });

  it('Confirm passes trimmed remarks, or undefined when blank', async () => {
    const { onConfirm } = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Transfer' }));
    expect(onConfirm).toHaveBeenLastCalledWith(undefined);

    await userEvent.type(remarksBox(), '  hand over  ');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Transfer' }));
    expect(onConfirm).toHaveBeenLastCalledWith('hand over');
  });

  it('keeps the dialog open and shows the server error', () => {
    renderDialog({ error: 'Case is no longer ready for transfer.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Case is no longer ready for transfer.');
    expect(screen.getByRole('button', { name: 'Confirm Transfer' })).toBeEnabled();
  });
});
