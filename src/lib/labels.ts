/**
 * English labels for statuses and reasons, for the web apps and the clerk app.
 * Farmer and plucker apps translate through `src/lib/i18n.ts` instead.
 */
import type { DeliveryStatus, DisputeReason, DisputeStatus, StaffRole } from '../types';

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  synced: 'Synced',
  pending: 'Pending sync',
  corrected: 'Corrected',
  reversal: 'Reversal',
};

export const DISPUTE_STATUS_LABEL: Record<DisputeStatus, string> = {
  open: 'Open',
  resolved_upheld: 'Resolved: upheld',
  resolved_rejected: 'Resolved: rejected',
};

export const DISPUTE_REASON_LABEL: Record<DisputeReason, string> = {
  weight_wrong: 'Weight is wrong',
  quality_wrong: 'Quality score is wrong',
  delivery_missing: 'Delivery is missing',
  wrong_farmer_number: 'Wrong farmer number',
  other: 'Other',
};

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  county_officer: 'County officer',
  county_auditor: 'County auditor',
  unit_manager: 'Unit manager',
  factory_auditor: 'Factory auditor',
  clerk: 'Buying centre clerk',
  system: 'System',
};

export const PRIVACY_NOTE = 'Farmer-level records stay with each factory.';
