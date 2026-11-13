import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Alert, Button, Icon, Sidebar, type SidebarGroup } from '../design-system';
import './WebLayout.css';

/* ------------------------------------------------------------------ */
/* Media query                                                         */
/* ------------------------------------------------------------------ */

const DRAWER_QUERY = '(max-width: 899px)';

function subscribeDrawerQuery(cb: () => void): () => void {
  const mq = window.matchMedia(DRAWER_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function isDrawerMode(): boolean {
  return window.matchMedia(DRAWER_QUERY).matches;
}

/** True under 900px, where the sidebar becomes an overlay drawer. */
function useDrawerMode(): boolean {
  return useSyncExternalStore(subscribeDrawerQuery, isDrawerMode, () => false);
}

const FOCUSABLE = 'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* ------------------------------------------------------------------ */
/* WebLayout                                                           */
/* ------------------------------------------------------------------ */

export interface WebLayoutProps {
  /** Tenant name shown in the sidebar and the small-screen top bar. */
  orgName: string;
  /** Second line under the name, e.g. the readable ID. */
  orgSubtitle?: string;
  /** Tenant logo (data URL or asset URL). Falls back to initials. Only the factory can change it. */
  logoUrl?: string;
  /** Sidebar navigation. Items use `to` (router paths); set `end` on index items. */
  groups: SidebarGroup[];
  /** Page content, usually the role's nested <Routes>. */
  children: ReactNode;
}

/**
 * Web shell for the county and factory apps: design-system Sidebar (260px) on
 * the left, content on the right (max 1280px). Under 900px the sidebar becomes
 * an overlay drawer opened from a menu button in a top bar; it traps focus and
 * closes on Escape, on navigation and on backdrop click.
 */
export function WebLayout({ orgName, orgSubtitle, logoUrl, groups, children }: WebLayoutProps) {
  const drawerMode = useDrawerMode();
  const [open, setOpen] = useState(false);
  const drawerOpen = drawerMode && open;
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) menuBtnRef.current?.focus();
  }, []);

  // Close on navigation, and leave drawer mode cleanly when the window grows.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!drawerMode) setOpen(false);
  }, [drawerMode]);

  // Scroll the content back to the top on page change.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // While the drawer is open: focus the first item, lock page scroll.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const first = drawerRef.current?.querySelector<HTMLElement>('.tl-sb-item[aria-current="page"]') ?? drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  function onDrawerKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (!drawerOpen) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      close(true);
      return;
    }
    if (e.key !== 'Tab' || !drawerRef.current) return;
    const items = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="wl">
      <div className="wl-topbar">
        <button
          ref={menuBtnRef}
          type="button"
          className="wl-menu-btn"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          aria-controls="wl-drawer"
          onClick={() => setOpen(true)}
        >
          <Icon name="menu" />
        </button>
        {logoUrl ? <img className="wl-topbar-logo" src={logoUrl} alt="" /> : null}
        <span className="wl-topbar-name">{orgName}</span>
      </div>

      {drawerOpen ? <div className="wl-backdrop" onClick={() => close(true)} aria-hidden="true" /> : null}

      <div
        id="wl-drawer"
        ref={drawerRef}
        className={drawerOpen ? 'wl-side wl-side-open' : 'wl-side'}
        role={drawerMode ? 'dialog' : undefined}
        aria-modal={drawerOpen ? true : undefined}
        aria-label={drawerMode ? `${orgName} menu` : undefined}
        onKeyDown={onDrawerKeyDown}
      >
        {drawerMode ? (
          <button type="button" className="wl-close-btn" aria-label="Close menu" onClick={() => close(true)}>
            <Icon name="x" />
          </button>
        ) : null}
        <Sidebar
          className="wl-sidebar"
          orgName={orgName}
          orgSubtitle={orgSubtitle}
          logoUrl={logoUrl}
          groups={groups}
          onNavigate={() => close(false)}
        />
      </div>

      <main className="wl-main" id="main-content">
        <div className="wl-content">{children}</div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PageHeader                                                          */
/* ------------------------------------------------------------------ */

export interface PageHeaderProps {
  /** Page title (Poppins). Also sets the document title. */
  title: string;
  /** One line under the title. */
  subtitle?: ReactNode;
  /** Buttons on the right (wrap under the title on small screens). */
  actions?: ReactNode;
  /** Back link above the title, e.g. `{ to: '/factory/farmers', label: 'Farmers' }`. */
  back?: { to: string; label: string };
  /** Extra row under the subtitle, e.g. IdTags and badges. */
  meta?: ReactNode;
}

/** Page header for web pages: title, subtitle, actions. */
export function PageHeader({ title, subtitle, actions, back, meta }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} · TwoLeaf demo`;
  }, [title]);

  return (
    <header className="wl-page-header">
      <div className="wl-page-header-text">
        {back ? (
          <Link className="wl-back" to={back.to}>
            <Icon name="arrow-left" />
            <span>{back.label}</span>
          </Link>
        ) : null}
        <h1 className="h1 wl-page-title">{title}</h1>
        {subtitle ? <p className="body wl-page-sub">{subtitle}</p> : null}
        {meta ? <div className="wl-page-meta">{meta}</div> : null}
      </div>
      {actions ? <div className="wl-page-actions">{actions}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* LoadError                                                           */
/* ------------------------------------------------------------------ */

export interface LoadErrorProps {
  /** What failed, e.g. "Could not load the dashboard." */
  title?: string;
  /** The API error message. */
  message?: string;
  /** Shows a "Try again" button. */
  onRetry?: () => void;
}

/** Error state for a card or page whose API call failed. */
export function LoadError({ title = 'Could not load this page.', message, onRetry }: LoadErrorProps) {
  return (
    <div className="wl-load-error">
      <Alert tone="danger" title={title}>
        {message ? <span>{message}</span> : null}
      </Alert>
      {onRetry ? (
        <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
