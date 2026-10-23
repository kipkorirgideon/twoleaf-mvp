/**
 * Monthly payments and bonuses derived from the ledger. The system never pays anyone;
 * these figures explain payments made by the factory.
 */
import type { AppState, Delivery, FarmerBonus, IsoDate, Membership, MonthKey, MonthlyPayment, Uuid } from '../../types';
import { computeBonus, farmerBonusCents } from '../../lib/bonus';
import { sumKg } from '../../lib/kg';
import { isEffective } from '../../lib/ledger';
import { amountCents, monthlyPayDate, monthlyRateCents, paymentStatus } from '../../lib/rates';
import { dateKeyOf, monthKeyOf } from '../../lib/time';
import { factoryRef, indexOf, isReceived, must } from './common';

/** Which entries count: factory views use received (synced) entries; farmer views also include pending. */
export type CountMode = 'received' | 'effective';

export const counts = (mode: CountMode) => (d: Delivery): boolean => (mode === 'received' ? isReceived(d) : isEffective(d));

export function monthlyPayment(state: AppState, membership: Membership, month: MonthKey, today: IsoDate, mode: CountMode): MonthlyPayment {
  const centre = must(indexOf(state).centres.get(membership.centreUuid), 'Centre');
  const ok = counts(mode);
  const kg = sumKg(
    state.deliveries.filter((d) => d.membershipUuid === membership.uuid && ok(d) && monthKeyOf(d.recordedAt) === month).map((d) => d.kg),
  );
  const rate = monthlyRateCents(month);
  const payDate = monthlyPayDate(month);
  return {
    month,
    membershipUuid: membership.uuid,
    factoryUuid: membership.factoryUuid,
    centreCode: centre.code,
    kg,
    rateCentsPerKg: rate,
    amountCents: amountCents(kg, rate),
    status: paymentStatus(payDate, today),
    payDate,
  };
}

/** FY bonus for a farmer at one factory (all their memberships at that factory). */
export function farmerBonusAt(state: AppState, factoryUuid: Uuid, memberships: readonly Membership[], today: IsoDate, mode: CountMode): FarmerBonus | null {
  const factory = indexOf(state).factories.get(factoryUuid);
  if (!factory) return null;
  const decl = factory.bonus;
  const ids = new Set(memberships.filter((m) => m.factoryUuid === factoryUuid).map((m) => m.uuid));
  if (ids.size === 0) return null;
  const ok = counts(mode);
  const kg = sumKg(
    state.deliveries
      .filter((d) => ids.has(d.membershipUuid) && ok(d))
      .filter((d) => {
        const day = dateKeyOf(d.recordedAt);
        return day >= decl.fyStart && day <= decl.fyEnd;
      })
      .map((d) => d.kg),
  );
  return {
    factory: factoryRef(factory),
    fy: decl.fy,
    kg,
    ratePerKgCents: decl.declaredPerKgCents,
    amountCents: farmerBonusCents(kg, decl.declaredPerKgCents),
    status: paymentStatus(decl.paidOn, today),
    paidOn: decl.paidOn,
    avgAuctionPriceCentsPerKg: factory.avgAuctionPriceCentsPerKg,
    computation: decl.inputs ? computeBonus(decl.inputs) : null,
  };
}
