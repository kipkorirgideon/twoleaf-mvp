/**
 * Demo clock and EAT (UTC+3, no daylight saving) date arithmetic.
 *
 * All date-times in the store are written by `toEatIso()` as
 * `YYYY-MM-DDTHH:mm:ss.sss+03:00`, so the first 10 characters are the EAT date
 * and strings sort chronologically.
 */
import type { IsoDate, IsoDateTime, MonthKey } from '../types';

export const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "Today" in the demo: Friday 23 October 2026, 15:00 EAT. Never use `new Date()` for "now". */
export const DEMO_NOW: IsoDateTime = '2026-10-23T15:00:00.000+03:00';
export const DEMO_NOW_MS: number = Date.parse(DEMO_NOW);
export const DEMO_TODAY: IsoDate = '2026-10-23';

/** Fine leaf target (Tea Board standard). */
export const FINE_LEAF_TARGET = 60;

/** Format epoch milliseconds as an EAT ISO string. */
export function toEatIso(ms: number): IsoDateTime {
  return new Date(ms + EAT_OFFSET_MS).toISOString().replace('Z', '+03:00');
}

/** Normalise any ISO string to the EAT form. */
export function normaliseIso(iso: string): IsoDateTime {
  return toEatIso(Date.parse(iso));
}

/** EAT date (`YYYY-MM-DD`) of an ISO date-time. */
export function dateKeyOf(iso: IsoDateTime): IsoDate {
  return iso.endsWith('+03:00') ? iso.slice(0, 10) : normaliseIso(iso).slice(0, 10);
}

/** EAT month (`YYYY-MM`) of an ISO date-time or date. */
export function monthKeyOf(isoOrDate: string): MonthKey {
  return isoOrDate.length <= 10 ? isoOrDate.slice(0, 7) : dateKeyOf(isoOrDate).slice(0, 7);
}

/** Epoch ms of an EAT wall-clock time on a date. */
export function eatMs(date: IsoDate, hours = 0, minutes = 0, seconds = 0): number {
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return Date.parse(`${date}T${hh}:${mm}:${ss}.000+03:00`);
}

export function eatIso(date: IsoDate, hours = 0, minutes = 0, seconds = 0): IsoDateTime {
  return toEatIso(eatMs(date, hours, minutes, seconds));
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function addMs(iso: IsoDateTime, ms: number): IsoDateTime {
  return toEatIso(Date.parse(iso) + ms);
}

export function addDaysIso(iso: IsoDateTime, days: number): IsoDateTime {
  return addMs(iso, days * DAY_MS);
}

/** Whole calendar days from a to b (b − a), by EAT date. */
export function daysBetween(a: IsoDate | IsoDateTime, b: IsoDate | IsoDateTime): number {
  const da = a.length <= 10 ? a : dateKeyOf(a);
  const db = b.length <= 10 ? b : dateKeyOf(b);
  return Math.round((Date.parse(`${db}T00:00:00Z`) - Date.parse(`${da}T00:00:00Z`)) / DAY_MS);
}

/** Inclusive list of dates. */
export function dateRange(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

/** The last `count` months ending with `month`, oldest first. */
export function lastMonths(month: MonthKey, count: number): MonthKey[] {
  const out: MonthKey[] = [];
  for (let i = count - 1; i >= 0; i -= 1) out.push(addMonths(month, -i));
  return out;
}

export function daysInMonth(month: MonthKey): number {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function firstDayOfMonth(month: MonthKey): IsoDate {
  return `${month}-01`;
}

export function lastDayOfMonth(month: MonthKey): IsoDate {
  return `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
}

/** Monday of the week containing the date. */
export function startOfWeek(date: IsoDate): IsoDate {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}

/** Hours between two date-times (b − a), floored. */
export function hoursBetween(a: IsoDateTime, b: IsoDateTime): number {
  return Math.floor((Date.parse(b) - Date.parse(a)) / (60 * 60 * 1000));
}

const APP_START_MS = Date.now();

/**
 * The demo clock: DEMO_NOW plus real time elapsed since the app loaded, capped at
 * 23:59 on the demo day so "today" never changes.
 *
 * Why add elapsed time: records created during a session (deliveries, corrections,
 * disputes, syncs) need distinct, increasing timestamps so they sort correctly, get
 * time-ordered UUIDs and readable IDs, and show sensible times on receipts. Stamping
 * them all with the fixed DEMO_NOW would make them identical. Seed data uses DEMO_NOW only.
 */
export function demoNowMs(): number {
  const elapsed = Math.max(0, Date.now() - APP_START_MS);
  return Math.min(DEMO_NOW_MS + elapsed, eatMs(DEMO_TODAY, 23, 59, 0));
}

export function demoNow(): IsoDateTime {
  return toEatIso(demoNowMs());
}
