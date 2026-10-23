/**
 * Clerk selectors: one buying centre, seen from its clerk device.
 */
import type { AppState, ClerkHome, DeliveryRow, DeviceId, FarmerLookupResult, IsoDateTime, PluckerRef, Uuid } from '../../types';
import { parseFarmerRef, parseReadableId, sameFarmerNumber } from '../../lib/ids';
import { sumKg, weightedPct } from '../../lib/kg';
import { isEffective } from '../../lib/ledger';
import { dateKeyOf } from '../../lib/time';
import type { RuleError } from '../rules';
import { byRecordedDesc, centreRef, factoryRef, farmerRefFor, indexOf, must, pluckerRef, toDeliveryRow } from './common';

export function selectClerkHome(state: AppState, deviceId: DeviceId, now: IsoDateTime): ClerkHome | null {
  const idx = indexOf(state);
  const device = idx.devices.get(deviceId);
  if (!device) return null;
  const centre = must(idx.centres.get(device.centreUuid), 'Centre');
  const factory = must(idx.factories.get(centre.factoryUuid), 'Factory');
  const clerk = idx.staff.get(device.clerkUuid);
  const today = dateKeyOf(now);
  const todays = state.deliveries.filter((d) => d.centreUuid === centre.uuid && isEffective(d) && dateKeyOf(d.recordedAt) === today);
  const listedPending = state.deliveries.filter((d) => d.deviceId === deviceId && d.status === 'pending').length;
  return {
    centre: centreRef(centre),
    factory: factoryRef(factory),
    clerkName: clerk ? clerk.name : '—',
    deviceId,
    online: device.online,
    offlineSince: device.offlineSince,
    lastSyncAt: device.lastSyncAt,
    today: {
      deliveries: todays.filter((d) => d.kg > 0).length,
      kg: sumKg(todays.map((d) => d.kg)),
      avgFineLeafPct: weightedPct(todays.map((d) => ({ kg: d.kg, pct: d.fineLeafPct }))),
    },
    pendingCount: listedPending + device.unlistedPendingCount,
    scaleIds: centre.scaleIds.slice(),
  };
}

/** Today's deliveries at a centre (all statuses), newest first. */
export function selectCentreToday(state: AppState, centreUuid: Uuid, now: IsoDateTime): DeliveryRow[] {
  const today = dateKeyOf(now);
  return state.deliveries
    .filter((d) => d.centreUuid === centreUuid && dateKeyOf(d.recordedAt) === today)
    .sort(byRecordedDesc)
    .map((d) => toDeliveryRow(state, d));
}

/** Deliveries waiting on a device, oldest first. */
export function selectPendingForDevice(state: AppState, deviceId: DeviceId): DeliveryRow[] {
  return state.deliveries
    .filter((d) => d.deviceId === deviceId && d.status === 'pending')
    .sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1))
    .map((d) => toDeliveryRow(state, d));
}

export function selectLinkedPluckers(state: AppState, farmerUuid: Uuid): PluckerRef[] {
  return state.pluckers.filter((p) => p.farmerUuids.includes(farmerUuid)).map(pluckerRef);
}

/**
 * Find a farmer at a centre by farmer number (`123`), `TG-043 / 123`, full TwoLeaf ID
 * or short ID (`FMR-0004817`). Only memberships at this centre match.
 */
export function lookupFarmerAtCentre(state: AppState, centreUuid: Uuid, query: string): FarmerLookupResult | RuleError {
  const idx = indexOf(state);
  const centre = idx.centres.get(centreUuid);
  if (!centre) return { code: 'not_found', message: 'Buying centre not found.' };
  const q = query.trim();
  if (!q) return { code: 'validation', message: 'Enter a farmer number.', field: 'query' };
  const atCentre = idx.membershipsByCentre.get(centre.uuid) ?? [];

  let membership = undefined as (typeof atCentre)[number] | undefined;
  const upper = q.toUpperCase();
  const full = parseReadableId(upper) ?? parseReadableId(`TLF-KCO-${upper}`);
  if (full) {
    if (full.kind !== 'farmer') return { code: 'validation', message: 'That is not a farmer ID.', field: 'query' };
    const id = upper.startsWith('TLF-') ? upper : `TLF-KCO-${upper}`;
    const farmer = state.farmers.find((f) => f.readableId === id);
    membership = farmer ? atCentre.find((m) => m.farmerUuid === farmer.uuid) : undefined;
    if (!membership) return { code: 'not_found', message: `No farmer with ID ${id} is registered at ${centre.code}.`, field: 'query' };
  } else {
    const ref = parseFarmerRef(q);
    if (!ref) return { code: 'validation', message: 'Type a farmer number such as 123, or scan the QR card.', field: 'query' };
    if (ref.centreCode && ref.centreCode !== centre.code) {
      return { code: 'not_found', message: `${ref.centreCode} / ${ref.farmerNumber} belongs to another buying centre. Use the farmer's ${centre.code} number.`, field: 'query' };
    }
    membership = atCentre.find((m) => sameFarmerNumber(m.farmerNumber, ref.farmerNumber));
    if (!membership) return { code: 'not_found', message: `No farmer number ${ref.farmerNumber} at ${centre.code} ${centre.name}. Check the number on the farmer's card.`, field: 'query' };
  }
  const farmer = must(idx.farmers.get(membership.farmerUuid), 'Farmer');
  return {
    farmer: farmerRefFor(state, membership),
    centre: centreRef(centre),
    phone: farmer.phone,
    pluckers: selectLinkedPluckers(state, farmer.uuid),
  };
}
