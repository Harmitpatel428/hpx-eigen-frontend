import { toast as sonnerToast } from 'sonner';
import type { ReactNode } from 'react';
import { AppToast, type ToastVariant, type ToastAction } from './AppToast';

export const DEFAULT_DURATION = 4000;

/**
 * Only the options AppToast + sonner actually honour. Narrowed on purpose so
 * passing something the standard toast cannot render (e.g. sonner's `description`
 * or `icon`) is a compile error instead of a silently-dropped value.
 */
export interface NotifyOptions {
  /** Auto-dismiss in ms (default 4000). Ignored for `loading` (persistent). */
  duration?: number;
  /** Explicit id — pass a `loading` toast's id to success/error to morph it in place. */
  id?: string | number;
  /** Optional bold heading above the message (the message then reads as meta). */
  title?: ReactNode;
  action?: ToastAction;
  cancel?: ToastAction;
}

/**
 * Stable id for de-duplication: two identical variant+string-message toasts
 * collapse into one. Skipped for non-string messages, explicit ids, and
 * `loading` (whose ids must stay unique so parallel jobs don't share one toast).
 */
function dedupeId(variant: ToastVariant, message: ReactNode, id?: string | number) {
  if (id !== undefined) return id;
  if (variant === 'loading') return undefined;
  if (typeof message === 'string') return `${variant}:${message}`;
  return undefined;
}

// Active-toast tracking (by id) powers the "+N more" queue chip in AppToaster.
const activeIds = new Set<string | number>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export function subscribeActiveCount(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
export function getActiveCount() { return activeIds.size; }

// Bumped per call so a re-fire or a morph remounts AppToast: the countdown
// restarts and the live region is re-inserted (so loading→error announces).
let renderSeq = 0;

function show(variant: ToastVariant, message: ReactNode, opts: NotifyOptions = {}) {
  const { action, cancel, title, id, duration } = opts;
  // Loading is always persistent; an action toast stays open until the user
  // chooses, unless the caller set an explicit auto-dismiss duration.
  const persistent = variant === 'loading' || ((action != null || cancel != null) && duration === undefined);
  const ms = persistent ? Infinity : (duration ?? DEFAULT_DURATION);
  const key = ++renderSeq;
  const toastId = dedupeId(variant, message, id) ?? `t-${key}`;
  activeIds.add(toastId);
  emit();
  const forget = () => { if (activeIds.delete(toastId)) emit(); };
  return sonnerToast.custom(
    (sid) => (
      <AppToast
        key={key}
        variant={variant}
        title={title}
        message={message}
        action={action}
        cancel={cancel}
        duration={ms}
        onDismiss={() => sonnerToast.dismiss(sid)}
      />
    ),
    { id: toastId, duration: ms, onDismiss: forget, onAutoClose: forget },
  );
}

/**
 * The one way to raise a notification. Backward-compatible with the sonner API
 * the app already used (`toast.success/error/warning/info` and a bare `toast()`),
 * plus `toast.loading(...)` which returns an id you can pass to `success`/`error`
 * to morph the toast in place when the work resolves.
 */
export const toast = Object.assign(
  (message: ReactNode, opts?: NotifyOptions) => show('info', message, opts),
  {
    success: (message: ReactNode, opts?: NotifyOptions) => show('success', message, opts),
    error: (message: ReactNode, opts?: NotifyOptions) => show('error', message, opts),
    warning: (message: ReactNode, opts?: NotifyOptions) => show('warning', message, opts),
    info: (message: ReactNode, opts?: NotifyOptions) => show('info', message, opts),
    loading: (message: ReactNode, opts?: NotifyOptions) => show('loading', message, opts),
    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  },
);

export type { ToastVariant };
