import React, { ReactNode, useRef, useEffect, useId } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
}

// open modals, innermost last: only the topmost reacts to Esc (nested modals)
const openStack: symbol[] = [];

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnEsc = true,
  closeOnBackdrop = true,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // registered once per open (not per onClose change) so re-renders keep nesting order
  const idRef = useRef(Symbol());
  useEffect(() => {
    if (!isOpen) return;
    const id = idRef.current;
    openStack.push(id);
    document.body.style.overflow = 'hidden';
    return () => {
      openStack.splice(openStack.indexOf(id), 1);
      // scroll lock is released only when the LAST modal closes, in any close order
      if (openStack.length === 0) document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = document.activeElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openStack[openStack.length - 1] !== idRef.current) return;
      if (closeOnEsc && e.key === 'Escape') {
        // Stop the ESC from also reaching an outer overlay's handler (e.g. a
        // ContextPanel window-level listener) so ESC closes only this dialog.
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    requestAnimationFrame(() => {
      const autofocus = dialogRef.current?.querySelector<HTMLElement>('[autofocus]');
      if (autofocus) autofocus.focus();
      else dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative surface-elevated w-full mx-4 ${sizeClasses[size]}`}
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <h2 id={titleId} className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-tertiary)' }}
            className="hover:opacity-80 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto" style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
