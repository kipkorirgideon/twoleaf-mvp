/**
 * Ledger rules shared by the seed generator, the reducer and the selectors.
 *
 *  - The ledger is append-only. A correction appends a reversal (negative kg) and a
 *    corrected entry; the original is kept and marked `corrected`.
 *  - "Effective" entries (`synced`, `pending`) are what totals and quality use. Because a
 *    reversal exactly cancels its original, effective kg equals the net ledger kg.
 *  - A day is sealed over the entries that *entered* the ledger that day (`enteredAt`), so
 *    later corrections never change a sealed day.
 */
import type { DayVerification, Delivery, IsoDate, ReadableId, SealedDay, Uuid } from '../types';
import { deliveryHash, fnv1a64, sealedDayHash } from './hash';
import { sumKg } from './kg';
import { dateKeyOf, eatMs } from './time';

export function isEffective(d: Delivery): boolean {
  return d.status === 'synced' || d.status === 'pending';
}

export function isInLedger(d: Delivery): boolean {
  return d.status !== 'pending';
}

/** Readable ID, or the temporary device ID while pending. */
export function deliveryDisplayId(d: Delivery): string {
  return d.readableId ?? d.tempId ?? '—';
}

/**
 * County-wide delivery sequence for a ledger time: deliveries are numbered across all
 * Kericho factories (≈1.04 million a year), so Tegat's numbers advance in jumps.
 */
export function timeBasedDeliverySeq(enteredMs: number): { year: number; seq: number } {
  const year = Number(new Date(enteredMs + 3 * 3600 * 1000).toISOString().slice(0, 4));
  const start = eatMs(`${year}-01-01`);
  const end = eatMs(`${year + 1}-01-01`);
  const frac = (enteredMs - start) / (end - start);
  return { year, seq: Math.max(1, Math.floor(frac * 1_040_000)) };
}

/** Next delivery sequence: time-based, but always after the last issued. */
export function nextDeliverySeq(lastByYear: Record<string, number>, enteredMs: number): { year: number; seq: number } {
  const { year, seq } = timeBasedDeliverySeq(enteredMs);
  const last = lastByYear[String(year)] ?? 0;
  return { year, seq: Math.max(seq, last + 1) };
}

/** Anchor for the first sealed day in the demo window (the chain continues from earlier days). */
export function chainAnchorHash(factoryReadableId: ReadableId, dayBefore: IsoDate): string {
  return fnv1a64(`${factoryReadableId}|${dayBefore}|anchor`);
}

/** Number of a factory's stored sealed days that fall in a month. */
export function sealedDaysInMonth(sealedDays: readonly SealedDay[], factoryUuid: Uuid, month: string): number {
  return sealedDays.filter((d) => d.factoryUuid === factoryUuid && d.date.slice(0, 7) === month).length;
}

/** Ledger entries a factory entered on a date, in ledger order. */
export function ledgerEntriesForDay(deliveries: readonly Delivery[], factoryUuid: Uuid, date: IsoDate): Delivery[] {
  return deliveries
    .filter((d) => d.factoryUuid === factoryUuid && d.enteredAt !== null && isInLedger(d) && dateKeyOf(d.enteredAt) === date)
    .sort((a, b) => a.key - b.key);
}

export interface DayFigures {
  count: number;
  totalKg: number;
  deliveryIds: ReadableId[];
}

export function dayFigures(entries: readonly Delivery[]): DayFigures {
  return {
    count: entries.length,
    totalKg: sumKg(entries.map((e) => e.kg)),
    deliveryIds: entries.map((e) => e.readableId).filter((id): id is ReadableId => id !== null),
  };
}

/** Build a chain of sealed days. Keys and UUIDs are supplied by the caller. */
export function buildSealedDays(
  deliveries: readonly Delivery[],
  factoryUuid: Uuid,
  dates: readonly IsoDate[],
  anchorHash: string,
  make: (date: IsoDate) => { key: number; uuid: Uuid; sealedAt: string },
): SealedDay[] {
  const out: SealedDay[] = [];
  let prevHash = anchorHash;
  for (const date of dates) {
    const fig = dayFigures(ledgerEntriesForDay(deliveries, factoryUuid, date));
    const hash = sealedDayHash({ prevHash, date, ...fig });
    const meta = make(date);
    out.push({ key: meta.key, uuid: meta.uuid, factoryUuid, date, ...fig, prevHash, hash, sealedAt: meta.sealedAt });
    prevHash = hash;
  }
  return out;
}

/**
 * Recompute every sealed day from the current ledger and compare with its seal.
 * Also checks each entry's own hash, so a silently edited kg is pinpointed.
 */
export function verifySealedDays(sealedDays: readonly SealedDay[], deliveries: readonly Delivery[]): DayVerification[] {
  const days = sealedDays.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const out: DayVerification[] = [];
  let prevHash = days[0]?.prevHash ?? '';
  for (const day of days) {
    const entries = ledgerEntriesForDay(deliveries, day.factoryUuid, day.date);
    const fig = dayFigures(entries);
    const recomputedHash = sealedDayHash({ prevHash, date: day.date, ...fig });
    const tamperedDeliveryIds = entries.filter((e) => deliveryHash(e) !== e.hash).map((e) => deliveryDisplayId(e));
    out.push({
      date: day.date,
      sealedHash: day.hash,
      recomputedHash,
      expected: { count: day.count, totalKg: day.totalKg },
      found: { count: fig.count, totalKg: fig.totalKg },
      ok: recomputedHash === day.hash && day.prevHash === prevHash && tamperedDeliveryIds.length === 0,
      tamperedDeliveryIds,
    });
    // Continue the chain from the stored seal so one bad day does not fail every later day.
    prevHash = day.hash;
  }
  return out;
}
