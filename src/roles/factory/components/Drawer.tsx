import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '../../../design-system';

export interface DrawerProps {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Right-side panel. Traps focus while open, closes on Escape and backdrop click,
 * and returns focus to whatever opened it.
 */
export function Drawer({ open, title, subtitle, onClose, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.querySelector<HTMLElement>('.fac-drawer-close')?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      const el = returnTo.current;
      if (el && document.contains(el)) el.focus();
    };
  }, [open]);

  if (!open) return null;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !panelRef.current.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <div className="fac-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div ref={panelRef} className="fac-drawer" role="dialog" aria-modal="true" aria-labelledby="fac-drawer-title" onKeyDown={onKeyDown}>
        <div className="fac-drawer-head">
          <div className="fac-drawer-titles">
            <h2 id="fac-drawer-title" className="h3">
              {title}
            </h2>
            {subtitle ? <div className="fac-drawer-sub">{subtitle}</div> : null}
          </div>
          <button type="button" className="fac-icon-btn fac-drawer-close" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="fac-drawer-body">{children}</div>
      </div>
    </>
  );
}
