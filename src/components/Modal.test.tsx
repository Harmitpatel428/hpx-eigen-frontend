import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Modal } from './Modal';

// The reject-note modal (DocumentationPage CaseDetailPanel) re-renders its parent on
// every keystroke (textarea value state) and passes a FRESH inline onClose each render.
// Run requestAnimationFrame synchronously so the modal's focus-on-open — and any buggy
// re-focus triggered by a re-render — is deterministic in jsdom.
beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0; });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

// Mirrors the real reject-note modal: controlled textarea + inline onClose (new identity
// each render). Before the fix, that identity change re-ran Modal's focus effect on every
// keystroke and its rAF re-focused the first button (the X), stealing focus from the textarea.
function RejectModalHarness({ onCloseSpy }: { onCloseSpy: () => void }) {
  const [note, setNote] = useState('');
  return (
    <Modal isOpen onClose={() => onCloseSpy()} title={'Reject "PAN Card"'} size="sm">
      <textarea aria-label="Rejection note" value={note} onChange={(e) => setNote(e.target.value)} />
    </Modal>
  );
}

describe('Modal — typing in a textarea never activates the close button', () => {
  it('keeps focus in the textarea across many keystrokes; the X never steals focus; onClose is not called', () => {
    const onClose = vi.fn();
    render(<RejectModalHarness onCloseSpy={onClose} />);

    const textarea = screen.getByLabelText('Rejection note') as HTMLTextAreaElement;
    const closeBtn = screen.getByLabelText('Close modal');

    // user clicks into the textarea
    textarea.focus();
    expect(document.activeElement).toBe(textarea);

    // type a rejection reason character-by-character; each keystroke re-renders the parent
    const reason = 'Document is blurry and the date is unreadable.';
    for (let i = 1; i <= reason.length; i++) {
      fireEvent.change(textarea, { target: { value: reason.slice(0, i) } });
      // after EACH keystroke-induced re-render, focus must stay on the textarea
      expect(document.activeElement).toBe(textarea);
    }

    // Enter / Space / arrows / Backspace must not move focus or close the modal
    fireEvent.keyDown(textarea, { key: 'Enter' });
    fireEvent.keyDown(textarea, { key: ' ' });
    fireEvent.keyDown(textarea, { key: 'ArrowLeft' });
    fireEvent.keyDown(textarea, { key: 'Backspace' });
    expect(document.activeElement).toBe(textarea);

    expect(document.activeElement).not.toBe(closeBtn);
    expect(onClose).not.toHaveBeenCalled();
    expect(textarea.value).toBe(reason);
  });

  it('the close button is type="button" so a keystroke can never submit an enclosing form', () => {
    render(<RejectModalHarness onCloseSpy={vi.fn()} />);
    expect(screen.getByLabelText('Close modal').getAttribute('type')).toBe('button');
  });

  it('Escape still closes the modal', () => {
    const onClose = vi.fn();
    render(<RejectModalHarness onCloseSpy={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking the X still closes the modal', () => {
    const onClose = vi.fn();
    render(<RejectModalHarness onCloseSpy={onClose} />);
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
