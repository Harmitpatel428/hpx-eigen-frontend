import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { ManagerOverrideDialog } from './DocumentationPage';

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0; });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function renderDialog(over: Partial<React.ComponentProps<typeof ManagerOverrideDialog>> = {}) {
  const props = { onClose: vi.fn(), onConfirm: vi.fn(), submitting: false, ...over };
  render(<ManagerOverrideDialog {...props} />);
  return props;
}
const box = () => screen.getByLabelText(/Reason/) as HTMLTextAreaElement;
const submit = () => screen.getByRole('button', { name: /Confirm Override/ });

describe('ManagerOverrideDialog', () => {
  it('blocks submit for empty / whitespace / too-short reasons, enables when valid', async () => {
    const p = renderDialog();
    expect(submit()).toBeDisabled();
    await userEvent.type(box(), '   ');
    expect(submit()).toBeDisabled();
    await userEvent.clear(box());
    await userEvent.type(box(), ' ab ');
    expect(submit()).toBeDisabled();
    await userEvent.type(box(), 'c');
    expect(submit()).toBeEnabled();
    await userEvent.click(submit());
    expect(p.onConfirm).toHaveBeenCalledWith('ab c');
  });

  it('submit is disabled while pending (no double-fire)', async () => {
    renderDialog({ submitting: true });
    await userEvent.type(box(), 'valid reason');
    expect(screen.getByRole('button', { name: /Submitting/ })).toBeDisabled();
  });

  it('cancel closes without confirming', async () => {
    const p = renderDialog();
    await userEvent.type(box(), 'valid reason');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(p.onClose).toHaveBeenCalled();
    expect(p.onConfirm).not.toHaveBeenCalled();
  });

  it('shows inline error and preserves the typed reason', async () => {
    renderDialog({ error: 'Manager override failed. Please try again.' });
    await userEvent.type(box(), 'keep me');
    expect(screen.getByRole('alert')).toHaveTextContent('Manager override failed');
    expect(box().value).toBe('keep me');
  });

  it('page source no longer uses window.prompt or the dead contact-change button', () => {
    const src = readFileSync('src/pages/DocumentationPage.tsx', 'utf8');
    expect(src).not.toMatch(/window\.prompt/);
    expect(src).not.toMatch(/Request contact change/);
  });
});
