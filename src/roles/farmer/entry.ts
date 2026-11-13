import type { BadgeProps } from '../../design-system';
import type { MessageKey } from '../../lib/i18n';
import type { DeliveryStatus, Uuid } from '../../types';

/** How a ledger entry reads to a farmer or plucker. */
export type EntryKind = 'recorded' | 'pending' | 'replaced' | 'reversal' | 'correction';

export function entryKind(e: { status: DeliveryStatus; correctionOf: Uuid | null }): EntryKind {
  switch (e.status) {
    case 'pending':
      return 'pending';
    case 'corrected':
      return 'replaced';
    case 'reversal':
      return 'reversal';
    case 'synced':
      return e.correctionOf ? 'correction' : 'recorded';
    default: {
      const never: never = e.status;
      return never;
    }
  }
}

export const ENTRY_LABEL: Record<EntryKind, MessageKey> = {
  recorded: 'entry.recorded',
  pending: 'entry.pending',
  replaced: 'entry.replaced',
  reversal: 'entry.reversal',
  correction: 'entry.correction',
};

export const ENTRY_HELP: Record<EntryKind, MessageKey> = {
  recorded: 'entry.recordedHelp',
  pending: 'entry.pendingHelp',
  replaced: 'entry.replacedHelp',
  reversal: 'entry.reversalHelp',
  correction: 'entry.correctionHelp',
};

export const ENTRY_TONE: Record<EntryKind, NonNullable<BadgeProps['tone']>> = {
  recorded: 'success',
  pending: 'warning',
  replaced: 'neutral',
  reversal: 'neutral',
  correction: 'info',
};
