import { useEffect, useRef, useState } from 'react';
import { cx } from '../cx';
import { Icon } from './Icon';

export interface IdTagProps {
  value: string;
  copyable?: boolean;
  /** Copy button verb. The aria-label is "<copyLabel> <value>", the tooltip is copyLabel. Default "Copy". */
  copyLabel?: string;
  /** Feedback after copying (aria-label and tooltip). Default "Copied". */
  copiedLabel?: string;
  className?: string;
}

export function IdTag({ value, copyable, copyLabel = 'Copy', copiedLabel = 'Copied', className }: IdTagProps) {
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
        <button type="button" onClick={copy} aria-label={copied ? copiedLabel : `${copyLabel} ${value}`} title={copied ? copiedLabel : copyLabel}>
          <Icon name={copied ? 'check' : 'copy'} />
        </button>
      )}
    </span>
  );
}
