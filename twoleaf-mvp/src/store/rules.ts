/**
 * Business rules shared by the fake API (to reject with a clear message) and the
 * reducer (to refuse invalid actions). Each validator returns null when valid, or a
 * field-keyed error.
 */
import type { AppState, Uuid } from '../types';
import { sameFarmerNumber } from '../lib/ids';
import type {
  CorrectionCommand,
  OpenDisputeCommand,
  RecordDeliveryCommand,
  RegisterFarmerCommand,
  ResolveDisputeCommand,
} from './actions';
import { indexOf } from './selectors/common';

export interface RuleError {
  code: 'not_found' | 'validation' | 'conflict' | 'offline';
  message: string;
  field?: string;
}

const err = (code: RuleError['code'], message: string, field?: string): RuleError => ({ code, message, ...(field ? { field } : {}) });

const hasOneDecimal = (n: number): boolean => Math.abs(Math.round(n * 10) - n * 10) < 1e-6;

export const MAX_QUALITY_ADJUST = 5;
export const MAX_DELIVERY_KG = 200;
export const DISPUTE_DAYS = 7;

export function validateRecordDelivery(state: AppState, cmd: RecordDeliveryCommand): RuleError | null {
  const idx = indexOf(state);
  const device = idx.devices.get(cmd.deviceId);
  if (!device) return err('not_found', 'This device is not registered.');
  const membership = idx.memberships.get(cmd.membershipUuid);
  if (!membership) return err('not_found', 'Farmer not found at this buying centre.', 'membershipUuid');
  if (membership.centreUuid !== device.centreUuid) return err('validation', 'This farmer number belongs to another buying centre.', 'membershipUuid');
  if (membership.status !== 'active') return err('validation', 'This membership is suspended.', 'membershipUuid');
  if (!(cmd.kg > 0)) return err('validation', 'Kilos must be more than 0.', 'kg');
  if (cmd.kg > MAX_DELIVERY_KG) return err('validation', `Kilos must be ${MAX_DELIVERY_KG} or less.`, 'kg');
  if (!hasOneDecimal(cmd.kg)) return err('validation', 'Kilos are recorded to one decimal.', 'kg');
  const centre = idx.centres.get(device.centreUuid);
  if (!centre || !centre.scaleIds.includes(cmd.scaleId)) return err('validation', 'Unknown scale for this buying centre.', 'scaleId');
  if (cmd.fineLeafPct < 0 || cmd.fineLeafPct > 100 || cmd.aiFineLeafPct < 0 || cmd.aiFineLeafPct > 100) {
    return err('validation', 'Fine leaf must be between 0 and 100%.', 'fineLeafPct');
  }
  if (Math.abs(cmd.fineLeafPct - cmd.aiFineLeafPct) > MAX_QUALITY_ADJUST) {
    return err('validation', `You can adjust the AI score by at most ${MAX_QUALITY_ADJUST} points.`, 'fineLeafPct');
  }
  if (cmd.fineLeafPct !== cmd.aiFineLeafPct && !cmd.qualityAdjustReason?.trim()) {
    return err('validation', 'Give a reason for adjusting the score.', 'qualityAdjustReason');
  }
  if (cmd.pluckerUuid) {
    const p = idx.pluckers.get(cmd.pluckerUuid);
    if (!p) return err('not_found', 'Plucker not found.', 'pluckerUuid');
    if (!p.farmerUuids.includes(membership.farmerUuid)) return err('validation', 'This plucker is not linked to the farmer.', 'pluckerUuid');
  }
  if (idx.deliveries.has(cmd.uuid)) return err('conflict', 'This delivery has already been saved.');
  return null;
}

export function validateCorrection(state: AppState, cmd: CorrectionCommand): RuleError | null {
  const idx = indexOf(state);
  const original = idx.deliveries.get(cmd.originalUuid);
  if (!original) return err('not_found', 'Delivery not found.');
  if (original.status === 'pending') return err('validation', 'Sync this delivery before correcting it.');
  if (original.status === 'corrected') return err('conflict', 'This delivery has already been corrected. Correct the newest entry instead.');
  if (original.status === 'reversal') return err('validation', 'Reversal entries cannot be corrected.');
  if (state.tampering?.deliveryUuid === original.uuid) return err('conflict', 'Restore the demo tampering first.');
  if (!(cmd.kg > 0)) return err('validation', 'Kilos must be more than 0.', 'kg');
  if (cmd.kg > MAX_DELIVERY_KG) return err('validation', `Kilos must be ${MAX_DELIVERY_KG} or less.`, 'kg');
  if (!hasOneDecimal(cmd.kg)) return err('validation', 'Kilos are recorded to one decimal.', 'kg');
  if (cmd.reason.trim().length < 5) return err('validation', 'Give a reason for the correction.', 'reason');
  if (cmd.membershipUuid) {
    const m = idx.memberships.get(cmd.membershipUuid);
    if (!m) return err('not_found', 'Farmer membership not found.', 'membershipUuid');
    if (m.factoryUuid !== original.factoryUuid) return err('validation', 'A correction cannot move a delivery to another factory.', 'membershipUuid');
  }
  const sameMembership = !cmd.membershipUuid || cmd.membershipUuid === original.membershipUuid;
  if (sameMembership && Math.round(cmd.kg * 10) === Math.round(original.kg * 10)) {
    return err('validation', 'The corrected kilos are the same as the original.', 'kg');
  }
  for (const id of [cmd.reversalUuid, cmd.correctedUuid]) if (idx.deliveries.has(id)) return err('conflict', 'Duplicate entry ID.');
  return null;
}

export function validateOpenDispute(state: AppState, cmd: OpenDisputeCommand): RuleError | null {
  const idx = indexOf(state);
  const m = idx.memberships.get(cmd.membershipUuid);
  if (!m) return err('not_found', 'Membership not found.', 'membershipUuid');
  if (cmd.deliveryUuid) {
    const d = idx.deliveries.get(cmd.deliveryUuid);
    if (!d) return err('not_found', 'Delivery not found.', 'deliveryUuid');
    if (d.farmerUuid !== m.farmerUuid || d.membershipUuid !== m.uuid) return err('validation', 'This delivery is not yours.', 'deliveryUuid');
    if (state.disputes.some((x) => x.deliveryUuid === d.uuid && x.status === 'open')) {
      return err('conflict', 'You have already reported a problem with this delivery.', 'deliveryUuid');
    }
  }
  if (cmd.reason === 'other' && cmd.note.trim().length < 5) return err('validation', 'Tell us what went wrong.', 'note');
  if (cmd.note.length > 500) return err('validation', 'Keep the note under 500 characters.', 'note');
  if (idx.disputes.has(cmd.uuid)) return err('conflict', 'This report has already been sent.');
  return null;
}

export function validateResolveDispute(state: AppState, cmd: ResolveDisputeCommand): RuleError | null {
  const idx = indexOf(state);
  const dispute = idx.disputes.get(cmd.disputeUuid);
  if (!dispute) return err('not_found', 'Dispute not found.');
  if (dispute.status !== 'open') return err('conflict', 'This dispute is already resolved.');
  if (cmd.outcome === 'rejected') {
    if (cmd.note.trim().length < 5) return err('validation', 'A note is required when rejecting.', 'note');
    if (cmd.correction) return err('validation', 'A rejected dispute cannot include a correction.');
  }
  if (cmd.correction) {
    const original = idx.deliveries.get(cmd.correction.originalUuid);
    if (!original || original.factoryUuid !== dispute.factoryUuid) return err('validation', 'The correction must be for a delivery at this factory.');
    return validateCorrection(state, cmd.correction);
  }
  return null;
}

/** Next free farmer number at a centre: one more than the highest in use, padded to 3 digits. */
export function nextFarmerNumber(state: AppState, centreUuid: Uuid): string {
  const list = indexOf(state).membershipsByCentre.get(centreUuid) ?? [];
  const max = list.reduce((acc, m) => Math.max(acc, Number(m.farmerNumber) || 0), 0);
  const width = Math.max(3, ...list.map((m) => m.farmerNumber.length));
  return String(max + 1).padStart(width, '0');
}

export function isFarmerNumberTaken(state: AppState, centreUuid: Uuid, farmerNumber: string): boolean {
  const list = indexOf(state).membershipsByCentre.get(centreUuid) ?? [];
  return list.some((m) => sameFarmerNumber(m.farmerNumber, farmerNumber));
}

const PHONE_RE = /^07\d{2}\s?\d{3}\s?\d{3}$/;

export function validateRegisterFarmer(state: AppState, cmd: RegisterFarmerCommand): RuleError | null {
  const idx = indexOf(state);
  if (cmd.name.trim().split(/\s+/).length < 2) return err('validation', 'Enter the farmer’s first and last name.', 'name');
  if (!PHONE_RE.test(cmd.phone.trim())) return err('validation', 'Enter a phone number like 0722 123 456.', 'phone');
  if (!/^\d{7,8}$/.test(cmd.nationalId.trim())) return err('validation', 'National ID must be 7 or 8 digits.', 'nationalId');
  const centre = idx.centres.get(cmd.centreUuid);
  if (!centre) return err('not_found', 'Choose a buying centre.', 'centreUuid');
  if (!/^\d{1,4}$/.test(cmd.farmerNumber.trim())) return err('validation', 'Farmer number must be 1 to 4 digits.', 'farmerNumber');
  if (Number(cmd.farmerNumber) === 0) return err('validation', 'Farmer number must be more than 0.', 'farmerNumber');
  if (isFarmerNumberTaken(state, cmd.centreUuid, cmd.farmerNumber.trim())) {
    return err('conflict', `${centre.code} / ${cmd.farmerNumber.trim()} is already taken at this centre. Try ${nextFarmerNumber(state, cmd.centreUuid)}.`, 'farmerNumber');
  }
  const existing = state.farmers.find((f) => f.nationalId === cmd.nationalId.trim());
  if (existing) {
    const already = (idx.membershipsByFarmer.get(existing.uuid) ?? []).some((m) => m.centreUuid === cmd.centreUuid);
    if (already) return err('conflict', `This farmer is already registered at ${centre.code}.`, 'nationalId');
  }
  if (idx.farmers.has(cmd.farmerUuid) || idx.memberships.has(cmd.membershipUuid)) return err('conflict', 'Duplicate registration.');
  return null;
}
