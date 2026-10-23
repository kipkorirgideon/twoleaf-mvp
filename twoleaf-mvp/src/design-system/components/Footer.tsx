import { cx } from '../cx';
import { PoweredBy } from './PoweredBy';

export interface FooterLink {
  label: string;
  href?: string;
}

export interface FooterProps {
  links?: FooterLink[];
  poweredByHref?: string;
  className?: string;
}

export function Footer({ links, poweredByHref, className }: FooterProps) {
  return (
    <footer className={cx('tl-footer', className)}>
      <nav aria-label="Footer">
        {(links || []).map((l) => (
          <a key={l.label} href={l.href || '#'}>
            {l.label}
          </a>
        ))}
      </nav>
      <PoweredBy href={poweredByHref} />
    </footer>
  );
}
