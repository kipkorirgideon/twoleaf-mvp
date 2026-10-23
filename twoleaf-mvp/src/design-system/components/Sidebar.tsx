import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cx } from '../cx';
import { Icon, type IconName } from './Icon';
import { PoweredBy } from './PoweredBy';
import { ThemeToggle } from './ThemeToggle';

export interface SidebarItem {
  label: string;
  icon?: IconName;
  /** Router path. Renders a React Router NavLink; `aria-current="page"` is set when the route matches. */
  to?: string;
  /** With `to`: only match the exact path (use for index pages such as `/factory`). */
  end?: boolean;
  /** Plain link (bundle.js behaviour). Used only when `to` is not set. */
  href?: string;
  /** Marks a plain `href` item as current. Ignored for `to` items (the router decides). */
  active?: boolean;
  /** Badge count, e.g. open disputes. Hidden when 0. */
  count?: number;
}

export interface SidebarGroup {
  label?: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  /** The tenant's name: county or factory. */
  orgName: string;
  orgSubtitle?: string;
  /** The factory's own logo. The only brand element a factory can change. Falls back to initials. */
  logoUrl?: string;
  groups: SidebarGroup[];
  /** Bottom slot above the Powered by credit. Defaults to a ThemeToggle; pass your own node to replace it. */
  footer?: ReactNode;
  poweredByHref?: string;
  className?: string;
  id?: string;
  /** Called after any nav item is clicked (e.g. to close the mobile drawer). */
  onNavigate?: () => void;
}

function initials(name: string): string {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function ItemContent({ it }: { it: SidebarItem }) {
  return (
    <>
      <Icon name={it.icon || 'leaf'} />
      <span>{it.label}</span>
      {it.count ? (
        <span className="tl-sb-count" aria-label={`${it.count} open`}>
          {it.count}
        </span>
      ) : null}
    </>
  );
}

export function Sidebar({ orgName, orgSubtitle, logoUrl, groups, footer, poweredByHref, className, id, onNavigate }: SidebarProps) {
  return (
    <aside id={id} className={cx('tl-sidebar', className)} aria-label="Main navigation">
      <div className="tl-sb-brand">
        {logoUrl ? (
          <img className="tl-sb-logo" src={logoUrl} alt={`${orgName} logo`} />
        ) : (
          <span className="tl-sb-initials" aria-hidden="true">
            {initials(orgName)}
          </span>
        )}
        <div>
          <div className="tl-sb-name">{orgName}</div>
          {orgSubtitle ? <div className="tl-sb-sub">{orgSubtitle}</div> : null}
        </div>
      </div>
      {(groups || []).map((g, gi) => (
        <div key={g.label || `g${gi}`}>
          {g.label ? <div className="tl-sb-group">{g.label}</div> : null}
          <nav className="tl-sb-nav" aria-label={g.label ?? `${orgName} navigation`}>
            {g.items.map((it) =>
              it.to ? (
                <NavLink key={it.label} to={it.to} end={it.end} className="tl-sb-item" onClick={onNavigate}>
                  <ItemContent it={it} />
                </NavLink>
              ) : (
                <a
                  key={it.label}
                  className="tl-sb-item"
                  href={it.href || '#'}
                  aria-current={it.active ? 'page' : undefined}
                  onClick={onNavigate}
                >
                  <ItemContent it={it} />
                </a>
              ),
            )}
          </nav>
        </div>
      ))}
      <div className="tl-sb-bottom">
        {footer === undefined ? <ThemeToggle /> : footer}
        <PoweredBy href={poweredByHref} />
      </div>
    </aside>
  );
}
