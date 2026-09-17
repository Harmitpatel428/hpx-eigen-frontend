import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number | string;
  hideCloseButton?: boolean;
  /** Accessible name for the dialog (screen readers). */
  ariaLabel?: string;
}

export function ContextPanel({ isOpen, onClose, children, width = 600, hideCloseButton = false, ariaLabel = 'Details panel' }: ContextPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ESC to close — only when no input is focused
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Focus management: remember the opener, move focus into the panel, and
  // restore focus to the opener when the panel closes (keyboard/AT users).
  useEffect(() => {
    if (!isOpen) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(id);
      const opener = restoreFocusRef.current;
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Focus trap — keep Tab / Shift+Tab inside the panel (and any modal it stacks).
  const trapFocus = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const root = panelRef.current;
    if (!root) return;
    const focusable = Array.from(root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null);
    if (focusable.length === 0) { e.preventDefault(); root.focus(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement;
    if (e.shiftKey) {
      if (active === first || active === root) { e.preventDefault(); last.focus(); }
    } else if (active === last) {
      e.preventDefault(); first.focus();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(2px)',
          zIndex: 999,
          animation: 'fadeIn 0.2s ease-out forwards',
        }}
      />
      
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onKeyDown={trapFocus}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width,
          maxWidth: '90vw',
          backgroundColor: 'var(--bg-app)',
          borderLeft: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-xl)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {!hideCloseButton && (
          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              position: 'absolute',
              top: 'var(--space-4)',
              right: 'var(--space-4)',
              zIndex: 10,
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-light)',
            }}
          >
            <X size={16} />
          </button>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
