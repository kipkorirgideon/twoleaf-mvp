import type { ReactNode } from 'react';
import { DataTable, IdTag, type DataTableColumn } from '../../../design-system';
import { formatDate, formatKg, formatPct, formatTime } from '../../../lib/format';
import type { DeliveryRow } from '../../../types';
import { DeliveryStatusBadge } from './Badges';
import { useOpenDelivery } from './DeliveryDrawer';

export interface DeliveryTableProps {
  rows: DeliveryRow[] | undefined;
  loading?: boolean;
  /** Hide the farmer column (e.g. on the farmer detail page). */
  hideFarmer?: boolean;
  caption?: string;
  emptyMessage?: ReactNode;
}

/** Standard delivery table. Clicking a row opens the delivery drawer. */
export function DeliveryTable({ rows, loading, hideFarmer, caption, emptyMessage = 'No deliveries match.' }: DeliveryTableProps) {
  const open = useOpenDelivery();
  const columns: DataTableColumn<DeliveryRow>[] = [
    {
      key: 'recordedAt',
      label: 'Date and time',
      render: (r) => (
        <span className="web-cell-2">
          <span className="web-nowrap">{formatDate(r.recordedAt)}</span>
          <span className="text-muted tl-num">{formatTime(r.recordedAt)}</span>
        </span>
      ),
    },
    { key: 'displayId', label: 'Delivery ID', render: (r) => <IdTag value={r.displayId} copyable={false} /> },
  ];
  if (!hideFarmer) {
    columns.push({
      key: 'farmer',
      label: 'Farmer',
      render: (r) => (
        <span className="web-cell-2">
          <span className="web-nowrap">{r.farmer.farmerRef}</span>
          <span className="text-muted web-nowrap">{r.farmer.name}</span>
        </span>
      ),
    });
  } else {
    columns.push({ key: 'centre', label: 'Centre / number', render: (r) => <span className="web-nowrap">{r.farmer.farmerRef}</span> });
  }
  columns.push(
    { key: 'kg', label: 'Kilos', align: 'right', render: (r) => <span className="web-nowrap">{formatKg(r.kg)}</span> },
    { key: 'fineLeafPct', label: 'Fine leaf', align: 'right', render: (r) => formatPct(r.fineLeafPct) },
    { key: 'plucker', label: 'Plucker', render: (r) => (r.plucker ? <span className="web-nowrap">{r.plucker.name}</span> : <span className="text-muted">Farmer</span>) },
    { key: 'status', label: 'Status', render: (r) => <DeliveryStatusBadge status={r.status} /> },
  );

  return (
    <DataTable
      columns={columns}
      rows={rows ?? []}
      loading={loading}
      caption={caption}
      onRowClick={(r) => open(r.uuid)}
      rowKey={(r) => r.uuid}
      emptyMessage={emptyMessage}
    />
  );
}
