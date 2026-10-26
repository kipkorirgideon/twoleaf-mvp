import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../cx';

export interface CardProps {
  title?: ReactNode;
  /** Heading level of the title (h2, h3 or h4). Same look at every level. Default 3. */
  titleLevel?: 2 | 3 | 4;
  subtitle?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Card({ title, titleLevel = 3, subtitle, action, children, className, style }: CardProps) {
  const Heading = (`h${titleLevel}` as 'h2' | 'h3' | 'h4');
  return (
    <section className={cx('tl-card', className)} style={style}>
      {title || action ? (
        <div className="tl-card-head">
          <div>
            {title ? <Heading className="tl-card-title">{title}</Heading> : null}
            {subtitle ? <p className="tl-card-sub">{subtitle}</p> : null}
          </div>
          {action || null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
