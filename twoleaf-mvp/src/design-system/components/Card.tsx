import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../cx';

export interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Card({ title, subtitle, action, children, className, style }: CardProps) {
  return (
    <section className={cx('tl-card', className)} style={style}>
      {title || action ? (
        <div className="tl-card-head">
          <div>
            {title ? <h3 className="tl-card-title">{title}</h3> : null}
            {subtitle ? <p className="tl-card-sub">{subtitle}</p> : null}
          </div>
          {action || null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
