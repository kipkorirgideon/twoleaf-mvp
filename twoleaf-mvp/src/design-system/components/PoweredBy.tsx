import { cx } from '../cx';
import { MariakaniMark } from './MariakaniMark';

export interface PoweredByProps {
  /** Company website. Opens in a new tab when set. */
  href?: string;
  className?: string;
}

/** The "Powered by Mariakani Labs" credit. Tenants cannot hide or restyle it. */
export function PoweredBy({ href, className }: PoweredByProps) {
  return (
    <a className={cx('tl-powered', className)} href={href || '#'} target={href ? '_blank' : undefined} rel={href ? 'noopener' : undefined}>
      <span>Powered by</span>
      <MariakaniMark size={20} />
      <b>Mariakani Labs</b>
    </a>
  );
}
