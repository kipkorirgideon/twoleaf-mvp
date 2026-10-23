import type { ReactNode } from 'react';
import { cx } from '../cx';
import { Icon, type IconName } from './Icon';

export interface AlertProps {
  tone?: 'success' | 'warning' | 'danger' | 'info';
  title?: string;
  children?: ReactNode;
  className?: string;
}

const ALERT_ICON: Record<NonNullable<AlertProps['tone']>, IconName> = {
  success: 'check',
  warning: 'alert',
  danger: 'alert',
  info: 'info',
};

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  return (
    <div className={cx('tl-alert', `tl-alert-${tone}`, className)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={ALERT_ICON[tone]} />
      <div>
        {title ? <strong>{title}</strong> : null}
        {children}
      </div>
    </div>
  );
}
