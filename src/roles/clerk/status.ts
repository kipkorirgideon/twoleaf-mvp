import type { BadgeProps } from '../../design-system';
import type { DeliveryStatus } from '../../types';

/** Badge tone per delivery status. The word comes from DELIVERY_STATUS_LABEL. */
export const DELIVERY_STATUS_TONE: Record<DeliveryStatus, NonNullable<BadgeProps['tone']>> = {
  synced: 'success',
  pending: 'warning',
  corrected: 'neutral',
  reversal: 'info',
};
