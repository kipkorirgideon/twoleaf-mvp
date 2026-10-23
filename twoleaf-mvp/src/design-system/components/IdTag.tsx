import { useEffect, useRef, useState } from 'react';
import { cx } from '../cx';
import { Icon } from './Icon';

export interface IdTagProps {
  value: string;
  copyable?: boolean;
  className?: string;
}

export function IdTag({ value, copyable, className }: IdTagProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function copy(): void {
    try {
      void navigator.clipboard.writeText(value).catch(() => undefined);
    } catch {
      // Clipboard not available (insecure context); still show feedback like bundle.js.
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <span className={cx('tl-id', className)}>
      <span>{value}</span>
      {copyable === false ? null : (
        <button type="button" onClick={copy} aria-label={copied ? 'Copied' : `Copy ${value}`} title={copied ? 'Copied' : 'Copy'}>
          <Icon name={copied ? 'check' : 'copy'} />
        </button>
      )}
    </span>
  );
}
