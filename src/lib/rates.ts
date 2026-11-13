/**
 * Monthly green leaf rates, financial years and payment dates (spec section 3, Money).
 * The system does not pay anyone; it shows payments made by the factory.
 */
import type { IsoDate, MonthKey, PaymentStatus } from '../types';
import { lastDayOfMonth } from './time';

export interface MonthlyRate {
  /** First month the rate applies to. */
  from: MonthKey;
  centsPerKg: number;
}

/** KSh 21.50/kg until January 2026, KSh 26.00/kg from February 2026. */
export const MONTHLY_RATES: readonly MonthlyRate[] = [
  { from: '2000-01', centsPerKg: 2150 },
  { from: '2026-02', centsPerKg: 2600 },
];

export function monthlyRateCents(month: MonthKey): number {
  let rate = MONTHLY_RATES[0]?.centsPerKg ?? 0;
  for (const r of MONTHLY_RATES) if (month >= r.from) rate = r.centsPerKg;
  return rate;
}

/** Monthly payment for month M is made on the last day of M ("To be paid 31 Oct"). */
export function monthlyPayDate(month: MonthKey): IsoDate {
  return lastDayOfMonth(month);
}

/** Paid once the pay date has passed (pay date strictly before today). */
export function paymentStatus(payDate: IsoDate, today: IsoDate): PaymentStatus {
  return payDate < today ? 'paid' : 'due';
}

/** Amount in cents for kilos at a rate, rounded to whole cents. */
export function amountCents(kg: number, centsPerKg: number): number {
  return Math.round(kg * centsPerKg);
}

/** Financial year 1 Jul – 30 Jun. `fyOf('2026-03-04')` → `2025/26`. */
export function fyOf(date: IsoDate): string {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const start = m >= 7 ? y : y - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
}

export function fyRange(fy: string): { from: IsoDate; to: IsoDate } {
  const start = Number(fy.slice(0, 4));
  return { from: `${start}-07-01`, to: `${start + 1}-06-30` };
}

/** Bonus (second payment) schedule for FY 2025/26. */
export const BONUS_FY = '2025/26';
export const BONUS_FORMULA_VERSION = 'v2026.1';
export const BONUS_DECLARED_ON: IsoDate = '2026-09-18';
export const BONUS_PAID_ON: IsoDate = '2026-10-15';
