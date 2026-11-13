import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../design-system';
import { truncateHash } from '../../lib/format';

export interface HashTextProps {
  hash: string;
  /** Characters shown before the ellipsis. Default 8. */
  visible?: number;
  label?: string;
}

/** A hash in mono, truncated, with a copy button for the full value. Uses the IdTag styles. */
export function HashText({ hash, visible = 8, label = 'hash' }: HashTextProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function copy(): void {
    try {
      void navigator.clipboard.writeText(hash).catch(() => undefined);
    } catch {
      // Clipboard unavailable; still show feedback.
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <span className="tl-id" title={hash}>
      <span>{truncateHash(hash, visible)}</span>
      <button type="button" onClick={copy} aria-label={copied ? 'Copied' : `Copy full ${label}`}>
        <Icon name={copied ? 'check' : 'copy'} />
      </button>
    </span>
  );
}
