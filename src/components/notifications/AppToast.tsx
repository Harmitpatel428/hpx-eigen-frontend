import type { CSSProperties, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading';

const ICON = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Info, loading: Loader2 } as const;
// Error/warning interrupt (assertive alert); success/info/loading are polite status updates.
const ASSERTIVE: Record<ToastVariant, boolean> = { error: true, warning: true, success: false, info: false, loading: false };

export interface ToastAction {
  label: ReactNode;
  onClick: () => void;
}

interface Props {
  variant: ToastVariant;
  message: ReactNode;
  onDismiss: () => void;
  /** Bold heading; the message then reads as a quieter meta/description line. */
  title?: ReactNode;
  /** Primary action; clicking runs the handler then dismisses. Rendered as a filled pill. */
  action?: ToastAction;
  /** Secondary action (ghost pill). */
  cancel?: ToastAction;
  /** Auto-dismiss duration in ms; drives the countdown hairline. `Infinity` = persistent. */
  duration?: number;
}

/**
 * The single standard notification surface. A neutral elevated card with a bare
 * semantic-coloured icon (no accent bar, no tinted square), a title/meta
 * hierarchy, app-taxonomy pill actions, a ghost dismiss and a hairline
 * countdown — all from central tokens.
 */
export function AppToast({ variant, title, message, onDismiss, action, cancel, duration }: Props) {
  const Icon = ICON[variant];
  const assertive = ASSERTIVE[variant];
  const run = (fn: () => void) => () => { fn(); onDismiss(); };
  const showProgress = variant !== 'loading' && typeof duration === 'number' && Number.isFinite(duration) && duration > 0;
  const style = showProgress ? ({ '--toast-duration': `${duration}ms` } as CSSProperties) : undefined;
  return (
    <div
      className="app-toast"
      data-variant={variant}
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={style}
    >
      <Icon className={`app-toast__icon${variant === 'loading' ? ' app-toast__icon--spin' : ''}`} size={18} aria-hidden="true" />
      <div className="app-toast__body" data-has-title={title != null || undefined}>
        {title != null && <div className="app-toast__title">{title}</div>}
        <div className="app-toast__message">{message}</div>
        {(action || cancel) && (
          <div className="app-toast__actions">
            {cancel && (
              <button type="button" className="btn btn-ghost" onClick={run(cancel.onClick)}>{cancel.label}</button>
            )}
            {action && (
              <button type="button" className="btn btn-primary" onClick={run(action.onClick)}>{action.label}</button>
            )}
          </div>
        )}
      </div>
      <button type="button" className="app-toast__dismiss" aria-label="Dismiss notification" onClick={onDismiss}>
        <X size={16} aria-hidden="true" />
      </button>
      {showProgress && <span className="app-toast__progress" aria-hidden="true" />}
    </div>
  );
}
