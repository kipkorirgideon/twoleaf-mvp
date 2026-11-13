/**
 * Shared lookups and row builders for selectors. Indexes are cached per state object
 * (the state is immutable, so identity is a safe cache key).
 */
import type {
  AppState,
  BuyingCentre,
  CentreRef,
  ClerkDevice,
  Delivery,
  DeliveryDetail,
  DeliveryRow,
  Dispute,
  Factory,
  FactoryRef,
  Farmer,
  FarmerRef,
  Membership,
  Plucker,
  PluckerRef,
  StaffUser,
  Uuid,
} from '../../types';
import { deliveryHash } from '../../lib/hash';
import { formatFarmerRef } from '../../lib/ids';
import { deliveryDisplayId } from '../../lib/ledger';

export interface StateIndex {
  factories: Map<Uuid, Factory>;
  centres: Map<Uuid, BuyingCentre>;
  centresByCode: Map<string, BuyingCentre>;
  farmers: Map<Uuid, Farmer>;
  memberships: Map<Uuid, Membership>;
  membershipsByFarmer: Map<Uuid, Membership[]>;
  membershipsByCentre: Map<Uuid, Membership[]>;
  pluckers: Map<Uuid, Plucker>;
  staff: Map<Uuid, StaffUser>;
  devices: Map<string, ClerkDevice>;
  deliveries: Map<Uuid, Delivery>;
  /** Reversal / corrected entries by the original they refer to. */
  linksByOriginal: Map<Uuid, Delivery[]>;
  disputes: Map<Uuid, Dispute>;
}

const cache = new WeakMap<AppState, StateIndex>();

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function indexOf(state: AppState): StateIndex {
  const hit = cache.get(state);
  if (hit) return hit;
  const idx: StateIndex = {
    factories: new Map(state.factories.map((f) => [f.uuid, f])),
    centres: new Map(state.centres.map((c) => [c.uuid, c])),
    centresByCode: new Map(state.centres.map((c) => [c.code, c])),
    farmers: new Map(state.farmers.map((f) => [f.uuid, f])),
    memberships: new Map(state.memberships.map((m) => [m.uuid, m])),
    membershipsByFarmer: new Map(),
    membershipsByCentre: new Map(),
    pluckers: new Map(state.pluckers.map((p) => [p.uuid, p])),
    staff: new Map(state.staff.map((s) => [s.uuid, s])),
    devices: new Map(state.devices.map((d) => [d.deviceId, d])),
    deliveries: new Map(state.deliveries.map((d) => [d.uuid, d])),
    linksByOriginal: new Map(),
    disputes: new Map(state.disputes.map((d) => [d.uuid, d])),
  };
  for (const m of state.memberships) {
    push(idx.membershipsByFarmer, m.farmerUuid, m);
    push(idx.membershipsByCentre, m.centreUuid, m);
  }
  for (const d of state.deliveries) {
    const orig = d.reversalOf ?? d.correctionOf;
    if (orig) push(idx.linksByOriginal, orig, d);
  }
  cache.set(state, idx);
  return idx;
}

/** Throwing lookups for internal use (callers validate existence first). */
export function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`${what} not found`);
  return value;
}

export function factoryRef(f: Factory): FactoryRef {
  return { uuid: f.uuid, readableId: f.readableId, code: f.code, name: f.name, shortName: f.shortName };
}

export function centreRef(c: BuyingCentre): CentreRef {
  return { uuid: c.uuid, readableId: c.readableId, code: c.code, name: c.name, factoryUuid: c.factoryUuid };
}

export function pluckerRef(p: Plucker): PluckerRef {
  return { uuid: p.uuid, readableId: p.readableId, name: p.name };
}

export function farmerRefFor(state: AppState, membership: Membership): FarmerRef {
  const idx = indexOf(state);
  const farmer = must(idx.farmers.get(membership.farmerUuid), 'Farmer');
  const centre = must(idx.centres.get(membership.centreUuid), 'Centre');
  return {
    uuid: farmer.uuid,
    readableId: farmer.readableId,
    name: farmer.name,
    membershipUuid: membership.uuid,
    farmerNumber: membership.farmerNumber,
    farmerRef: formatFarmerRef(centre.code, membership.farmerNumber),
  };
}

export function toDeliveryRow(state: AppState, d: Delivery): DeliveryRow {
  const idx = indexOf(state);
  const membership = must(idx.memberships.get(d.membershipUuid), 'Membership');
  const centre = must(idx.centres.get(d.centreUuid), 'Centre');
  const plucker = d.pluckerUuid ? idx.pluckers.get(d.pluckerUuid) : undefined;
  return {
    uuid: d.uuid,
    displayId: deliveryDisplayId(d),
    readableId: d.readableId,
    tempId: d.tempId,
    recordedAt: d.recordedAt,
    enteredAt: d.enteredAt,
    farmer: farmerRefFor(state, membership),
    centre: centreRef(centre),
    kg: d.kg,
    fineLeafPct: d.fineLeafPct,
    intakeFineLeafPct: d.intakeFineLeafPct,
    plucker: plucker ? pluckerRef(plucker) : null,
    status: d.status,
    reversalOf: d.reversalOf,
    correctionOf: d.correctionOf,
  };
}

/**
 * Full delivery detail. When `scopeFactoryUuid` is given, linked entries and disputes
 * outside that factory are dropped (they cannot exist today, but the rule is enforced).
 */
export function toDeliveryDetail(state: AppState, d: Delivery, scopeFactoryUuid: Uuid | null): DeliveryDetail {
  const idx = indexOf(state);
  const inScope = (x: { factoryUuid: Uuid }): boolean => scopeFactoryUuid === null || x.factoryUuid === scopeFactoryUuid;
  const originalUuid = d.reversalOf ?? d.correctionOf;
  const original = originalUuid ? idx.deliveries.get(originalUuid) : undefined;
  const links = (idx.linksByOriginal.get(d.uuid) ?? []).filter(inScope);
  const clerk = idx.staff.get(d.clerkUuid);
  return {
    ...toDeliveryRow(state, d),
    aiFineLeafPct: d.aiFineLeafPct,
    qualityAdjustReason: d.qualityAdjustReason,
    clerkName: clerk ? clerk.name : 'Unknown clerk',
    scaleId: d.scaleId,
    deviceId: d.deviceId,
    photoRef: d.photoRef,
    hash: d.hash,
    hashValid: deliveryHash(d) === d.hash,
    correction: d.correction,
    original: original && inScope(original) ? toDeliveryRow(state, original) : null,
    reversals: links.filter((x) => x.status === 'reversal').map((x) => toDeliveryRow(state, x)),
    corrections: links.filter((x) => x.correctionOf === d.uuid).map((x) => toDeliveryRow(state, x)),
    disputeUuids: state.disputes.filter((x) => x.deliveryUuid === d.uuid && inScope(x)).map((x) => x.uuid),
  };
}

/** Newest first, ledger key as tie-breaker. */
export function byRecordedDesc(a: Delivery, b: Delivery): number {
  if (a.recordedAt !== b.recordedAt) return a.recordedAt < b.recordedAt ? 1 : -1;
  return b.key - a.key;
}

/** Deliveries a factory treats as received: synced entries (pending ones have not reached the factory). */
export function isReceived(d: Delivery): boolean {
  return d.status === 'synced';
}
