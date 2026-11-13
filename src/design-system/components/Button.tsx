import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cx } from '../cx';
import { Icon, type IconName } from './Icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  icon?: IconName;
  fullWidth?: boolean;
  /** Renders an <a> instead of a <button>. */
  href?: string;
}

export function Button({ variant = 'primary', size, icon, fullWidth, className, children, href, ...rest }: ButtonProps) {
  const cls = cx('tl-btn', `tl-btn-${variant}`, size === 'sm' && 'tl-btn-sm', fullWidth && 'tl-btn-full', className);
  const kids = (
    <>
      {icon ? <Icon name={icon} /> : null}
      <span>{children}</span>
    </>
  );
  if (href) {
    // Same as bundle.js: the remaining button attributes are passed to the <a>.
    const anchorRest = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a className={cls} href={href} {...anchorRest}>
        {kids}
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {kids}
    </button>
  );
}
