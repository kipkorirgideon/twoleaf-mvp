import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from '../cx';
import { Icon, type IconName } from './Icon';

/*
 * Toasts: short confirmations such as "Delivery saved" or "3 deliveries synced".
 *
 * - <Toast> is the presentational piece: an always-mounted polite live region
 *   that shows one message (or nothing).
 * - <ToastProvider> holds the current toast, auto-dismisses it, and renders a
 *   <Toast> region (or lets you place <ToastRegion> yourself, e.g. inside the
 *   phone frame).
 * - useToast() returns { show(message, tone?), dismiss() }.
 */

export type ToastTone = 'success' | 'info' | 'warning' | 'danger';

/**
 * Where the region sits.
 * - `bottom`: fixed, centred at the bottom of the viewport (web apps, demo bar).
 * - `inside`: absolute inside the nearest positioned ancestor, above a bottom tab bar (phone frame).
 * - `static`: in normal flow (used on /design).
 */
export type ToastPlacement = 'bottom' | 'inside' | 'static';

const TOAST_ICON: Record<ToastTone, IconName> = { success: 'check', info: 'info', warning: 'alert', danger: 'alert' };

export interface ToastProps {
  /** The message; `null` shows nothing but keeps the live region mounted so screen readers hear changes. */
  message: ReactNode | null;
  tone?: ToastTone;
  placement?: ToastPlacement;
  /** Shows a dismiss (x) button when set. */
  onDismiss?: () => void;
  /** Accessible name of the dismiss button. Default "Dismiss". */
  dismissLabel?: string;
  /** Called when the pointer or keyboard focus enters / leaves the toast (the provider pauses auto-dismiss). */
  onPauseChange?: (paused: boolean) => void;
  className?: string;
}

export function Toast({ message, tone = 'success', placement = 'bottom', onDismiss, dismissLabel = 'Dismiss', onPauseChange, className }: ToastProps) {
  const has = message !== null && message !== undefined && message !== false && message !== '';
  return (
    <div className={cx('tl-toast-region', `tl-toast-${placement}`, className)} aria-live="polite" aria-atomic="true">
      {has ? (
        <div
          className={cx('tl-alert', `tl-alert-${tone}`, 'tl-toast')}
          onMouseEnter={() => onPauseChange?.(true)}
          onMouseLeave={() => onPauseChange?.(false)}
          onFocus={() => onPauseChange?.(true)}
          onBlur={() => onPauseChange?.(false)}
        >
          <Icon name={TOAST_ICON[tone]} />
          <div className="tl-toast-msg">{message}</div>
          {onDismiss ? (
            <button type="button" className="tl-toast-close" aria-label={dismissLabel} onClick={onDismiss}>
              <Icon name="x" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface ToastState {
  id: number;
  message: ReactNode;
  tone: ToastTone;
}

export interface ToastApi {
  /** Shows a toast, replacing any current one. Tone defaults to `success`. */
  show: (message: ReactNode, tone?: ToastTone) => void;
  /** Hides the current toast now. */
  dismiss: () => void;
}

interface ToastContextValue extends ToastApi {
  toast: ToastState | null;
  setPaused: (paused: boolean) => void;
  dismissLabel: string;
  dismissible: boolean;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export interface ToastProviderProps {
  children?: ReactNode;
  /** Auto-dismiss after this many ms (paused while hovered or focused). Default 3500. */
  duration?: number;
  /** Placement of the built-in region. Default `bottom`. */
  placement?: ToastPlacement;
  /** Set to false to place <ToastRegion /> yourself (e.g. inside the phone frame). Default true. */
  region?: boolean;
  /** Show a dismiss button on each toast. Default true. */
  dismissible?: boolean;
  /** Accessible name of the dismiss button, e.g. "Funga" in Kiswahili. Default "Dismiss". */
  dismissLabel?: string;
}

export function ToastProvider({
  children,
  duration = 3500,
  placement = 'bottom',
  region = true,
  dismissible = true,
  dismissLabel = 'Dismiss',
}: ToastProviderProps) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [paused, setPaused] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!toast || paused) return undefined;
    const t = window.setTimeout(() => setToast(null), duration);
    return () => window.clearTimeout(t);
  }, [toast, paused, duration]);

  const show = useCallback((message: ReactNode, tone: ToastTone = 'success') => {
    seq.current += 1;
    setPaused(false);
    setToast({ id: seq.current, message, tone });
  }, []);
  const dismiss = useCallback(() => {
    setPaused(false);
    setToast(null);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ show, dismiss, toast, setPaused, dismissLabel, dismissible }),
    [show, dismiss, toast, dismissLabel, dismissible],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {region ? <ToastRegion placement={placement} /> : null}
    </ToastContext.Provider>
  );
}

export interface ToastRegionProps {
  placement?: ToastPlacement;
  className?: string;
}

/** The live region for the nearest ToastProvider. Use with `<ToastProvider region={false}>`. */
export function ToastRegion({ placement = 'bottom', className }: ToastRegionProps) {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('ToastRegion must be used inside ToastProvider');
  const { toast, dismiss, setPaused, dismissLabel, dismissible } = ctx;
  return (
    <Toast
      message={toast ? toast.message : null}
      tone={toast?.tone}
      placement={placement}
      onDismiss={dismissible ? dismiss : undefined}
      dismissLabel={dismissLabel}
      onPauseChange={setPaused}
      className={className}
    />
  );
}

/** `{ show, dismiss }` for the nearest ToastProvider. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return useMemo(() => ({ show: ctx.show, dismiss: ctx.dismiss }), [ctx.show, ctx.dismiss]);
}
