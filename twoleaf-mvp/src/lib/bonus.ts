/**
 * Bonus (second payment) formula `v2026.1`. The rate is always computed from the
 * saved inputs; nothing here hard-codes the result.
 *
 *   auction income        = made tea sold × average auction price
 *   monthly payments made = green leaf received × monthly rate
 *   left                  = income − processing costs − management fee and levies − monthly payments
 *   bonus per kg          = left ÷ green leaf received
 */
import type { BonusComputation, BonusInputs, BonusLine } from '../types';
import { formatKsh, formatKshPerKg, formatNumber } from './format';

export function computeBonus(inputs: BonusInputs): BonusComputation {
  const auctionIncomeCents = Math.round(inputs.madeTeaSoldKg * inputs.avgAuctionPriceCentsPerKg);
  const monthlyPaymentsCents = Math.round(inputs.greenLeafReceivedKg * inputs.monthlyRateCentsPerKg);
  const leftForSecondPaymentCents =
    auctionIncomeCents - inputs.processingCostsCents - inputs.managementFeeAndLeviesCents - monthlyPaymentsCents;
  const bonusPerKgCentsExact = inputs.greenLeafReceivedKg > 0 ? leftForSecondPaymentCents / inputs.greenLeafReceivedKg : 0;
  const bonusPerKgCents = Math.round(bonusPerKgCentsExact);

  const lines: BonusLine[] = [
    { key: 'made_tea_sold', label: 'Made tea sold', formula: null, kind: 'kg', value: inputs.madeTeaSoldKg, computed: false },
    {
      key: 'avg_auction_price',
      label: 'Average auction price',
      formula: null,
      kind: 'money_per_kg',
      value: inputs.avgAuctionPriceCentsPerKg,
      computed: false,
    },
    {
      key: 'auction_income',
      label: 'Auction income',
      formula: `${formatNumber(inputs.madeTeaSoldKg)} kg × ${formatKshPerKg(inputs.avgAuctionPriceCentsPerKg)}`,
      kind: 'money',
      value: auctionIncomeCents,
      computed: true,
    },
    {
      key: 'green_leaf_received',
      label: 'Green leaf received',
      formula: null,
      kind: 'kg',
      value: inputs.greenLeafReceivedKg,
      computed: false,
    },
    {
      key: 'processing_costs',
      label: 'Processing costs',
      formula: null,
      kind: 'money',
      value: inputs.processingCostsCents,
      computed: false,
    },
    {
      key: 'management_fee_levies',
      label: 'Management fee and levies',
      formula: null,
      kind: 'money',
      value: inputs.managementFeeAndLeviesCents,
      computed: false,
    },
    {
      key: 'monthly_payments',
      label: 'Monthly payments already made',
      formula: `${formatNumber(inputs.greenLeafReceivedKg)} kg × ${formatKshPerKg(inputs.monthlyRateCentsPerKg)}`,
      kind: 'money',
      value: monthlyPaymentsCents,
      computed: true,
    },
    {
      key: 'left_for_second_payment',
      label: 'Left for second payment',
      formula: 'Income − costs − levies − monthly payments',
      kind: 'money',
      value: leftForSecondPaymentCents,
      computed: true,
    },
    {
      key: 'bonus_per_kg',
      label: 'Bonus per kg',
      formula: `${formatKsh(leftForSecondPaymentCents, { decimals: 0 })} ÷ ${formatNumber(inputs.greenLeafReceivedKg)} kg`,
      kind: 'money_per_kg',
      value: bonusPerKgCents,
      computed: true,
    },
  ];

  return {
    formulaVersion: inputs.formulaVersion,
    auctionIncomeCents,
    monthlyPaymentsCents,
    leftForSecondPaymentCents,
    bonusPerKgCentsExact,
    bonusPerKgCents,
    lines,
  };
}

export interface BonusComparison {
  matches: boolean;
  differenceCents: number;
  message: string;
}

/** Compare a recomputed rate with the declared one. */
export function compareWithDeclared(computedPerKgCents: number, declaredPerKgCents: number): BonusComparison {
  const differenceCents = computedPerKgCents - declaredPerKgCents;
  const base = `Recomputed from saved inputs: ${formatKsh(computedPerKgCents)} per kg.`;
  if (differenceCents === 0) return { matches: true, differenceCents, message: `${base} Matches the declared figure.` };
  const dir = differenceCents > 0 ? 'more' : 'less';
  return {
    matches: false,
    differenceCents,
    message: `${base} ${formatKsh(Math.abs(differenceCents))} per kg ${dir} than the declared ${formatKsh(declaredPerKgCents)}.`,
  };
}

/** A farmer's bonus: FY kilos × rate, in cents. */
export function farmerBonusCents(kg: number, perKgCents: number): number {
  return Math.round(kg * perKgCents);
}

