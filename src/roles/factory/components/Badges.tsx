import { Badge } from '../../../design-system';
import { DELIVERY_STATUS_LABEL, DISPUTE_STATUS_LABEL } from '../../../lib/labels';
import { formatDate } from '../../../lib/format';
import type { CentreConnectivity, DeliveryStatus, DisputeRow, DisputeStatus, PaymentStatus } from '../../../types';

const DELIVERY_TONE: Record<DeliveryStatus, 'success' | 'warning' | 'neutral' | 'info'> = {
  synced: 'success',
  pending: 'warning',
  corrected: 'neutral',
  reversal: 'info',
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return <Badge tone={DELIVERY_TONE[status]}>{DELIVERY_STATUS_LABEL[status]}</Badge>;
}

const DISPUTE_TONE: Record<DisputeStatus, 'warning' | 'success' | 'neutral'> = {
  open: 'warning',
  resolved_upheld: 'success',
  resolved_rejected: 'neutral',
};

export function DisputeStatusBadge({ status }: { status: DisputeStatus }) {
  return <Badge tone={DISPUTE_TONE[status]}>{DISPUTE_STATUS_LABEL[status]}</Badge>;
}

/** Deadline: warning within 2 days, danger when overdue. Resolved disputes show the date only. */
export function DeadlineBadge({ dispute }: { dispute: Pick<DisputeRow, 'status' | 'deadlineAt' | 'daysToDeadline' | 'deadlineSoon'> }) {
  const date = formatDate(dispute.deadlineAt);
  if (dispute.status !== 'open') return <Badge tone="neutral">{date}</Badge>;
  const d = dispute.daysToDeadline;
  if (d < 0) return <Badge tone="danger">Overdue · {date}</Badge>;
  const left = d === 0 ? 'Due today' : d === 1 ? '1 day left' : `${d} days left`;
  return <Badge tone={dispute.deadlineSoon ? 'warning' : 'neutral'}>{`${left} · ${date}`}</Badge>;
}

/** "Online" or "Offline · 3 h / 14 waiting". */
export function ConnectivityBadge({ connectivity }: { connectivity: CentreConnectivity }) {
  if (connectivity.status === 'online') {
    return connectivity.pendingCount > 0 ? (
      <Badge tone="warning">{`Online · ${connectivity.pendingCount} waiting`}</Badge>
    ) : (
      <Badge tone="success">Online</Badge>
    );
  }
  return <Badge tone="danger">{`Offline · ${connectivity.offlineHours} h / ${connectivity.pendingCount} waiting`}</Badge>;
}

export function PaymentStatusBadge({ status, date }: { status: PaymentStatus; date: string }) {
  return status === 'paid' ? (
    <Badge tone="success">{`Paid ${formatDate(date)}`}</Badge>
  ) : (
    <Badge tone="info">{`To be paid ${formatDate(date)}`}</Badge>
  );
}
