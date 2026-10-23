import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, SelectField, ThemeToggle, twoleafIconUrl } from '../design-system';
import { useMutation } from '../api';
import type { Role } from '../types';
import './DemoBar.css';

interface RoleOption {
  role: Role;
  label: string;
  home: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  { role: 'county', label: 'County', home: '/county' },
  { role: 'factory', label: 'Factory', home: '/factory' },
  { role: 'clerk', label: 'Clerk', home: '/clerk' },
  { role: 'farmer', label: 'Farmer', home: '/farmer' },
  { role: 'plucker', label: 'Plucker', home: '/plucker' },
];

function roleFromPath(pathname: string): Role | '' {
  const first = pathname.split('/')[1] ?? '';
  const match = ROLE_OPTIONS.find((o) => o.role === first);
  return match ? match.role : '';
}

const TOAST_MS = 3500;

/** Always-visible bar at the top of every screen: role switcher, theme and demo reset. */
export function DemoBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = roleFromPath(location.pathname);

  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const reset = useMutation((api) => api.resetDemo());
  const resetBtnRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus into the confirmation (onto Cancel) when it opens.
  useEffect(() => {
    if (confirming) panelRef.current?.querySelector<HTMLButtonElement>('.demo-bar-confirm-actions button')?.focus();
  }, [confirming]);

  // Close the confirmation when the person switches role or page.
  useEffect(() => {
    setConfirming(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  function onRoleChange(e: ChangeEvent<HTMLSelectElement>): void {
    const opt = ROLE_OPTIONS.find((o) => o.role === e.target.value);
    if (opt) navigate(opt.home);
  }

  function closeConfirm(): void {
    setConfirming(false);
    reset.reset();
    // Return focus to the button that opened the confirmation.
    resetBtnRef.current?.querySelector('button')?.focus();
  }

  async function confirmReset(): Promise<void> {
    try {
      await reset.run(undefined);
      closeConfirm();
      setToast('Demo data reset');
    } catch {
      // The error is shown inside the confirmation panel.
    }
  }

  function onPanelKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'Escape' && !reset.pending) {
      e.stopPropagation();
      closeConfirm();
    }
  }

  return (
    <header className="demo-bar">
      <div className="demo-bar-brand">
        <img className="demo-bar-icon" src={twoleafIconUrl} alt="" width={28} height={28} />
        <span className="demo-bar-name">TwoLeaf demo</span>
        <span className="demo-bar-pill" title="Demo · all data is invented">
          Demo · all data is invented
        </span>
      </div>

      <div className="demo-bar-controls">
        <SelectField label="Viewing as" className="demo-bar-role" value={current} onChange={onRoleChange}>
          {current === '' ? (
            <option value="" disabled>
              Choose a role
            </option>
          ) : null}
          {ROLE_OPTIONS.map((o) => (
            <option key={o.role} value={o.role}>
              {o.label}
            </option>
          ))}
        </SelectField>
        <ThemeToggle className="demo-bar-theme" />
        <div ref={resetBtnRef} className="demo-bar-reset">
          <Button
            variant="secondary"
            size="sm"
            icon="refresh"
            aria-label="Reset demo data"
            aria-expanded={confirming}
            aria-controls="demo-reset-panel"
            onClick={() => (confirming ? closeConfirm() : setConfirming(true))}
          >
            Reset demo data
          </Button>
        </div>
      </div>

      {confirming ? (
        <div
          id="demo-reset-panel"
          ref={panelRef}
          className="demo-bar-confirm"
          role="dialog"
          aria-modal="false"
          aria-labelledby="demo-reset-title"
          onKeyDown={onPanelKeyDown}
        >
          <h2 id="demo-reset-title" className="h3">
            Reset demo data?
          </h2>
          <p className="body-sm text-muted">
            Every change made in any role (deliveries, disputes, corrections, logos) is replaced with the original seed data. Your theme stays
            as it is.
          </p>
          {reset.error ? <Alert tone="danger">{reset.error.message}</Alert> : null}
          <div className="demo-bar-confirm-actions">
            <Button variant="ghost" size="sm" onClick={closeConfirm} disabled={reset.pending}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" icon="refresh" onClick={() => void confirmReset()} disabled={reset.pending}>
              {reset.pending ? 'Resetting…' : 'Reset demo data'}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="demo-bar-toast" aria-live="polite">
        {toast ? <Alert tone="success">{toast}</Alert> : null}
      </div>
    </header>
  );
}
