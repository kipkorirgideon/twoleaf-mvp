/**
 * Deterministic hashing for the ledger and audit chain: 64-bit FNV-1a over the
 * UTF-8 bytes of the input, shown as 16 lowercase hex characters.
 */
import type { Delivery, IsoDate } from '../types';

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;
const encoder = new TextEncoder();

/** FNV-1a 64-bit, 16 hex characters. */
export function fnv1a64(input: string): string {
  const bytes = encoder.encode(input);
  let h = FNV_OFFSET;
  for (let i = 0; i < bytes.length; i += 1) {
    h ^= BigInt(bytes[i] as number);
    h = (h * FNV_PRIME) & MASK_64;
  }
  return h.toString(16).padStart(16, '0');
}

/** Fields of a ledger entry covered by its hash. */
export type DeliveryHashFields = Pick<
  Delivery,
  'uuid' | 'membershipUuid' | 'recordedAt' | 'kg' | 'fineLeafPct' | 'scaleId' | 'deviceId' | 'reversalOf' | 'correctionOf'
>;

/** Canonical string hashed for a ledger entry. The readable ID is not included because it is assigned on sync. */
export function deliveryHashInput(d: DeliveryHashFields): string {
  return [
    d.uuid,
    d.membershipUuid,
    d.recordedAt,
    d.kg.toFixed(1),
    String(d.fineLeafPct),
    d.scaleId,
    d.deviceId,
    d.reversalOf ?? '',
    d.correctionOf ?? '',
  ].join('|');
}

export function deliveryHash(d: DeliveryHashFields): string {
  return fnv1a64(deliveryHashInput(d));
}

export interface SealedDayHashFields {
  prevHash: string;
  date: IsoDate;
  count: number;
  totalKg: number;
  deliveryIds: readonly string[];
}

/** `hash(prevHash + date + count + totalKg + list of delivery IDs)` (spec section 3). */
export function sealedDayHash(f: SealedDayHashFields): string {
  return fnv1a64([f.prevHash, f.date, String(f.count), f.totalKg.toFixed(1), f.deliveryIds.join(',')].join('|'));
}

/** Checksum for an audit pack: factory, month and every entry's ID and hash. */
export function auditPackChecksum(factoryReadableId: string, month: string, entries: ReadonlyArray<{ id: string; hash: string }>): string {
  return fnv1a64([factoryReadableId, month, ...entries.map((e) => `${e.id}:${e.hash}`)].join('|'));
}
