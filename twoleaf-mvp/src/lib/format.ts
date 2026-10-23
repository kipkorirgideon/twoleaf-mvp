/**
 * Display formatting. The only place money (integer cents), kilos, percentages and
 * dates are turned into text. Deterministic: no locale or time-zone dependence.
 */
import type { Change, IsoDate, IsoDateTime, MonthKey } from '../types';
import { dateKeyOf, daysBetween, hoursBetween, normaliseIso } from './time';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

/** Group thousands with commas: 1234567.8 → "1,234,567.8". */
export function formatNumber(value: number, decimals = 0): string {
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, frac] = fixed.split('.') as [string, string | undefined];
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '−' : ''}${grouped}${frac !== undefined ? `.${frac}` : ''}`;
}

export interface MoneyOptions {
  /** 2 (default) shows cents; 0 rounds to whole shillings. */
  decimals?: 0 | 2;
}

/** Integer cents → "KSh 1,234.50". */
export function formatKsh(cents: number, options: MoneyOptions = {}): string {
  const decimals = options.decimals ?? 2;
  return `KSh ${formatNumber(cents / 100, decimals)}`;
}

/** Integer cents per kg → "KSh 17.10/kg". */
export function formatKshPerKg(centsPerKg: number): string {
  return `${formatKsh(centsPerKg)}/kg`;
}

/** Large amounts in short form: "KSh 271.4 M". */
export function formatKshCompact(cents: number): string {
  const ksh = cents / 100;
  if (Math.abs(ksh) >= 1_000_000_000) return `KSh ${formatNumber(ksh / 1_000_000_000, 2)} B`;
  if (Math.abs(ksh) >= 1_000_000) return `KSh ${formatNumber(ksh / 1_000_000, 1)} M`;
  return formatKsh(cents, { decimals: 0 });
}

/** Kilos → "1,234.5 kg" (one decimal by default). */
export function formatKg(kg: number, decimals = 1): string {
  return `${formatNumber(kg, decimals)} kg`;
}

/** Percent → "58%". */
export function formatPct(pct: number, decimals = 0): string {
  return `${formatNumber(pct, decimals)}%`;
}

/** Percentage-point gap → "3 pts". */
export function formatPts(pts: number, decimals = 0): string {
  return `${formatNumber(pts, decimals)} ${Math.abs(pts) === 1 ? 'pt' : 'pts'}`;
}

/** Change with an arrow and a word, never colour alone: "↑ 4.2% vs last month". */
export function formatChange(change: Change, suffix = 'vs last month'): string {
  const arrow = change.direction === 'up' ? '↑' : change.direction === 'down' ? '↓' : '→';
  const word = change.direction === 'flat' ? 'No change' : `${arrow} ${formatNumber(Math.abs(change.pct), 1)}%`;
  return suffix ? `${word} ${suffix}` : word;
}

/** Compute a Change between two values (pct relative to `previous`). */
export function changeBetween(current: number, previous: number): Change {
  if (previous === 0) return { direction: current > 0 ? 'up' : 'flat', pct: 0 };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.05) return { direction: 'flat', pct: 0 };
  return { direction: pct > 0 ? 'up' : 'down', pct: Math.round(Math.abs(pct) * 10) / 10 };
}

/* ------------------------------------------------------------------ */
/* Dates (EAT)                                                         */
/* ------------------------------------------------------------------ */

function parts(isoOrDate: string): { y: number; m: number; d: number; hh: string; mm: string } {
  const iso = isoOrDate.length <= 10 ? `${isoOrDate}T00:00:00.000+03:00` : isoOrDate.endsWith('+03:00') ? isoOrDate : normaliseIso(isoOrDate);
  return {
    y: Number(iso.slice(0, 4)),
    m: Number(iso.slice(5, 7)),
    d: Number(iso.slice(8, 10)),
    hh: iso.slice(11, 13),
    mm: iso.slice(14, 16),
  };
}

/** "23 Oct 2026" */
export function formatDate(isoOrDate: IsoDate | IsoDateTime): string {
  const p = parts(isoOrDate);
  return `${p.d} ${MONTHS_SHORT[p.m - 1]} ${p.y}`;
}

/** "23 Oct" */
export function formatDateShort(isoOrDate: IsoDate | IsoDateTime): string {
  const p = parts(isoOrDate);
  return `${p.d} ${MONTHS_SHORT[p.m - 1]}`;
}

/** "Fri 23 Oct 2026" */
export function formatWeekdayDate(isoOrDate: IsoDate | IsoDateTime): string {
  const date = isoOrDate.length <= 10 ? isoOrDate : dateKeyOf(isoOrDate);
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return `${WEEKDAYS_SHORT[dow]} ${formatDate(date)}`;
}

/** "15:00" (24-hour EAT) */
export function formatTime(iso: IsoDateTime): string {
  const p = parts(iso);
  return `${p.hh}:${p.mm}`;
}

/** "23 Oct 2026, 15:00" */
export function formatDateTime(iso: IsoDateTime): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** "October 2026" */
export function formatMonth(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** "Oct 2026" */
export function formatMonthShort(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}

/** "Oct" */
export function formatMonthAbbr(month: MonthKey): string {
  const m = Number(month.slice(5, 7));
  return MONTHS_SHORT[m - 1] ?? month;
}

/** "today", "yesterday", "2 days ago", "tomorrow", "in 3 days". */
export function formatRelativeDays(target: IsoDate | IsoDateTime, now: IsoDateTime): string {
  const diff = daysBetween(now, target);
  if (diff === 0) return 'today';
  if (diff === -1) return 'yesterday';
  if (diff === 1) return 'tomorrow';
  return diff < 0 ? `${-diff} days ago` : `in ${diff} days`;
}

/** "Open, 2 days" style age: "today", "1 day", "4 days". */
export function formatAgeDays(since: IsoDate | IsoDateTime, now: IsoDateTime): string {
  const d = daysBetween(since, now);
  if (d <= 0) return 'today';
  return d === 1 ? '1 day' : `${d} days`;
}

/** "3 h", "45 min", "2 d". */
export function formatDurationSince(since: IsoDateTime, now: IsoDateTime): string {
  const minutes = Math.floor((Date.parse(now) - Date.parse(since)) / 60000);
  if (minutes < 60) return `${Math.max(0, minutes)} min`;
  const hours = hoursBetween(since, now);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

/** "Verified today 06:00", "Synced yesterday 18:40", "Synced 12 Oct 2026, 09:15". */
export function formatWhen(iso: IsoDateTime, now: IsoDateTime): string {
  const d = daysBetween(iso, now);
  if (d === 0) return `today ${formatTime(iso)}`;
  if (d === 1) return `yesterday ${formatTime(iso)}`;
  return formatDateTime(iso);
}

/* ------------------------------------------------------------------ */
/* Other                                                               */
/* ------------------------------------------------------------------ */

/** "0722 418 123" → "07XX XXX 123" */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `07XX XXX ${digits.slice(-3)}`;
}

/** "a1b2c3d4e5f60718" → "a1b2c3d4…" */
export function truncateHash(hash: string, visible = 8): string {
  return hash.length > visible ? `${hash.slice(0, visible)}…` : hash;
}

/** "1 delivery", "3 deliveries" */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}
