import { IdTag } from '../../../design-system';
import { formatKg } from '../../../lib/format';
import type { DeliveryRow, Uuid } from '../../../types';
import { DeliveryStatusBadge } from './Badges';
import { useOpenDelivery } from './DeliveryDrawer';

export interface LedgerEntryLinkProps {
  /** "Original", "Reversal", "Corrected entry". */
  label: string;
  row: DeliveryRow;
  /** Defaults to opening the delivery drawer. */
  onOpen?: (uuid: Uuid) => void;
}

/** One linked ledger entry (original, reversal or corrected) as a list item that opens it in the drawer. */
export function LedgerEntryLink({ label, row, onOpen }: LedgerEntryLinkProps) {
  const openDrawer = useOpenDelivery();
  const open = onOpen ?? openDrawer;
  return (
    <li>
      <button type="button" className="fac-link-btn" onClick={() => open(row.uuid)} aria-label={`Open ${label.toLowerCase()} ${row.displayId}`}>
        {label}
      </button>
      <IdTag value={row.displayId} copyable={false} />
      <span className="tl-num">{formatKg(row.kg)}</span>
      <DeliveryStatusBadge status={row.status} />
    </li>
  );
}
