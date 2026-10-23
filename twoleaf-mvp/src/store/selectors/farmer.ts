/**
 * Farmer selectors: one farmer's own data, combined across all memberships
 * (e.g. Tegat TG-043 / 123 and Toror TR-012 / 0456). Pending deliveries are included
 * (the farmer has the receipt); they show with status `pending`.
 */
import type {
  AppState,
  Delivery,
  FarmerBonus,
  FarmerCentreCard,
  FarmerDeliveryDetail,
  FarmerDeliveryRow,
  FarmerDisputeRow,
  FarmerHome,
  FarmerPayments,
  FarmerPeriod,
  FarmerProfile,
  IsoDate,
  IsoDateTime,
  Membership,
  MonthKey,
  Uuid,
} from '../../types';
import { fnv1a64 } from '../../lib/hash';
import { formatFarmerRef } from '../../lib/ids';
import { sumKg, weightedPct } from '../../lib/kg';
import { deliveryDisplayId, isEffective } from '../../lib/ledger';
import { FINE_LEAF_TARGET, addMonths, dateKeyOf, firstDayOfMonth, lastMonths, monthKeyOf } from '../../lib/time';
import { byRecordedDesc, centreRef, factoryRef, indexOf, must, pluckerRef } from './common';
import { farmerBonusAt, monthlyPayment } from './payments';

export function periodRange(period: FarmerPeriod, today: IsoDate): { from: IsoDate; to: IsoDate } {
  const month = monthKeyOf(today);
  const year = Number(today.slice(0, 4));
  switch (period) {
    case 'this_month':
      return { from: firstDayOfMonth(month), to: today };
    case '3_months':
      return { from: firstDayOfMonth(addMonths(month, -2)), to: today };
    case '6_months':
      return { from: firstDayOfMonth(addMonths(month, -5)), to: today };
    case '9_months':
      return { from: firstDayOfMonth(addMonths(month, -8)), to: today };
    case 'this_year':
      return { from: `${year}-01-01`, to: today };
    case 'last_year':
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    default: {
      const never: never = period;
      throw new Error(`Unknown period ${String(never)}`);
    }
  }
}

function monthsBetween(from: IsoDate, to: IsoDate): MonthKey[] {
  const out: MonthKey[] = [];
  for (let m = monthKeyOf(from); m <= monthKeyOf(to); m = addMonths(m, 1)) out.push(m);
  return out;
}

function membershipsOf(state: AppState, farmerUuid: Uuid): Membership[] {
  return (indexOf(state).membershipsByFarmer.get(farmerUuid) ?? []).slice().sort((a, b) => a.key - b.key);
}

function ownEntries(state: AppState, farmerUuid: Uuid): Delivery[] {
  const ids = new Set(membershipsOf(state, farmerUuid).map((m) => m.uuid));
  return state.deliveries.filter((d) => ids.has(d.membershipUuid));
}

export function selectFarmerHome(state: AppState, farmerUuid: Uuid, period: FarmerPeriod, now: IsoDateTime): FarmerHome | null {
  const idx = indexOf(state);
  const farmer = idx.farmers.get(farmerUuid);
  if (!farmer) return null;
  const today = dateKeyOf(now);
  const { from, to } = periodRange(period, today);
  const inRange = (d: Delivery): boolean => {
    const day = dateKeyOf(d.recordedAt);
    return day >= from && day <= to;
  };
  const memberships = membershipsOf(state, farmerUuid);
  const entries = ownEntries(state, farmerUuid).filter(isEffective);
  const periodEntries = entries.filter(inRange);
  const months = monthsBetween(from, to);
  const thisMonth = monthKeyOf(today);

  let paidCents = 0;
  let dueCents = 0;
  for (const m of memberships) {
    for (const month of months) {
      const p = monthlyPayment(state, m, month, today, 'effective');
      if (p.status === 'paid') paidCents += p.amountCents;
      else dueCents += p.amountCents;
    }
  }

  const centres: FarmerCentreCard[] = memberships.map((m) => {
    const centre = must(idx.centres.get(m.centreUuid), 'Centre');
    const factory = must(idx.factories.get(m.factoryUuid), 'Factory');
    const own = periodEntries.filter((d) => d.membershipUuid === m.uuid);
    const pay = monthlyPayment(state, m, thisMonth, today, 'effective');
    return {
      membershipUuid: m.uuid,
      factory: factoryRef(factory),
      centre: centreRef(centre),
      farmerNumber: m.farmerNumber,
      farmerRef: formatFarmerRef(centre.code, m.farmerNumber),
      kg: sumKg(own.map((d) => d.kg)),
      fineLeafPct: weightedPct(own.map((d) => ({ kg: d.kg, pct: d.fineLeafPct }))),
      thisMonth: { kg: pay.kg, amountCents: pay.amountCents, status: pay.status, payDate: pay.payDate },
    };
  });

  const fine = weightedPct(periodEntries.map((d) => ({ kg: d.kg, pct: d.fineLeafPct })));
  return {
    farmer: { uuid: farmer.uuid, readableId: farmer.readableId, name: farmer.name },
    period,
    periodFrom: from,
    periodTo: to,
    totals: {
      kg: sumKg(periodEntries.map((d) => d.kg)),
      fineLeafPct: fine,
      paidCents,
      dueCents,
      deliveries: periodEntries.filter((d) => d.kg > 0).length,
    },
    centres,
    trend: lastMonths(thisMonth, 6).map((month) => ({
      month,
      kg: sumKg(entries.filter((d) => monthKeyOf(d.recordedAt) === month).map((d) => d.kg)),
    })),
    belowTarget: fine !== null && fine < FINE_LEAF_TARGET,
    target: FINE_LEAF_TARGET,
  };
}

function toFarmerRow(state: AppState, d: Delivery): FarmerDeliveryRow {
  const idx = indexOf(state);
  const centre = must(idx.centres.get(d.centreUuid), 'Centre');
  const factory = must(idx.factories.get(d.factoryUuid), 'Factory');
  const m = must(idx.memberships.get(d.membershipUuid), 'Membership');
  const plucker = d.pluckerUuid ? idx.pluckers.get(d.pluckerUuid) : undefined;
  return {
    uuid: d.uuid,
    displayId: deliveryDisplayId(d),
    recordedAt: d.recordedAt,
    centre: centreRef(centre),
    factoryShortName: factory.shortName,
    farmerRef: formatFarmerRef(centre.code, m.farmerNumber),
    kg: d.kg,
    fineLeafPct: d.fineLeafPct,
    intakeFineLeafPct: d.intakeFineLeafPct,
    plucker: plucker ? pluckerRef(plucker) : null,
    status: d.status,
    reversalOf: d.reversalOf,
    correctionOf: d.correctionOf,
  };
}

export function selectFarmerDeliveries(state: AppState, farmerUuid: Uuid, filters: { membershipUuid?: Uuid; limit?: number } = {}): FarmerDeliveryRow[] {
  const list = ownEntries(state, farmerUuid)
    .filter((d) => !filters.membershipUuid || d.membershipUuid === filters.membershipUuid)
    .sort(byRecordedDesc)
    .map((d) => toFarmerRow(state, d));
  return filters.limit ? list.slice(0, filters.limit) : list;
}

export function selectFarmerDelivery(state: AppState, farmerUuid: Uuid, deliveryUuid: Uuid): FarmerDeliveryDetail | null {
  const idx = indexOf(state);
  const d = idx.deliveries.get(deliveryUuid);
  const own = new Set(membershipsOf(state, farmerUuid).map((m) => m.uuid));
  if (!d || !own.has(d.membershipUuid)) return null;
  // Related entries, only where they belong to this farmer (a delivery moved from another farmer's number shows without that farmer's entries).
  const originalUuid = d.reversalOf ?? d.correctionOf ?? d.uuid;
  const related = state.deliveries
    .filter((x) => x.uuid !== d.uuid && own.has(x.membershipUuid))
    .filter((x) => x.uuid === originalUuid || x.reversalOf === originalUuid || x.correctionOf === originalUuid)
    .sort(byRecordedDesc)
    .map((x) => toFarmerRow(state, x));
  const clerk = idx.staff.get(d.clerkUuid);
  const open = state.disputes.find((x) => x.deliveryUuid === d.uuid && x.status === 'open');
  return {
    ...toFarmerRow(state, d),
    aiFineLeafPct: d.aiFineLeafPct,
    photoRef: d.photoRef,
    clerkName: clerk ? clerk.name : '—',
    scaleId: d.scaleId,
    correction: d.correction,
    openDisputeUuid: open ? open.uuid : null,
    related,
  };
}

export function selectFarmerPayments(state: AppState, farmerUuid: Uuid, now: IsoDateTime): FarmerPayments {
  const today = dateKeyOf(now);
  const memberships = membershipsOf(state, farmerUuid);
  const months = lastMonths(monthKeyOf(today), 6).reverse();
  const bonuses = Array.from(new Set(memberships.map((m) => m.factoryUuid)))
    .map((fu) => farmerBonusAt(state, fu, memberships, today, 'effective'))
    .filter((b): b is FarmerBonus => b !== null);
  return {
    months: months.map((month) => {
      const payments = memberships.map((m) => monthlyPayment(state, m, month, today, 'effective'));
      return { month, payments, totalCents: payments.reduce((a, p) => a + p.amountCents, 0) };
    }),
    bonuses,
  };
}

export function selectFarmerDisputes(state: AppState, farmerUuid: Uuid): FarmerDisputeRow[] {
  const idx = indexOf(state);
  return state.disputes
    .filter((d) => d.farmerUuid === farmerUuid)
    .sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1))
    .map((d) => {
      const centre = must(idx.centres.get(d.centreUuid), 'Centre');
      const factory = must(idx.factories.get(d.factoryUuid), 'Factory');
      const m = must(idx.memberships.get(d.membershipUuid), 'Membership');
      const delivery = d.deliveryUuid ? idx.deliveries.get(d.deliveryUuid) : undefined;
      const correctedUuid = d.resolution?.correctedDeliveryUuid ?? null;
      const correctedEntry = correctedUuid ? idx.deliveries.get(correctedUuid) : undefined;
      // Only expose the corrected entry if it is on one of this farmer's memberships.
      const corrected = correctedEntry && correctedEntry.farmerUuid === farmerUuid ? correctedEntry : undefined;
      return {
        uuid: d.uuid,
        readableId: d.readableId,
        factoryShortName: factory.shortName,
        farmerRef: formatFarmerRef(centre.code, m.farmerNumber),
        reason: d.reason,
        farmerNote: d.farmerNote,
        openedAt: d.openedAt,
        deadlineAt: d.deadlineAt,
        status: d.status,
        deliveryDisplayId: delivery ? deliveryDisplayId(delivery) : null,
        response: d.resolution ? { outcome: d.resolution.outcome, note: d.resolution.note, resolvedAt: d.resolution.resolvedAt } : null,
        correctedDeliveryUuid: corrected ? corrected.uuid : null,
        correctedDeliveryDisplayId: corrected ? deliveryDisplayId(corrected) : null,
      };
    });
}

export function selectFarmerProfile(state: AppState, farmerUuid: Uuid): FarmerProfile | null {
  const idx = indexOf(state);
  const farmer = idx.farmers.get(farmerUuid);
  if (!farmer) return null;
  return {
    uuid: farmer.uuid,
    readableId: farmer.readableId,
    name: farmer.name,
    phone: farmer.phone,
    joinedOn: farmer.joinedOn,
    memberships: membershipsOf(state, farmerUuid).map((m) => {
      const centre = must(idx.centres.get(m.centreUuid), 'Centre');
      const factory = must(idx.factories.get(m.factoryUuid), 'Factory');
      return {
        membershipUuid: m.uuid,
        factory: factoryRef(factory),
        centre: centreRef(centre),
        farmerNumber: m.farmerNumber,
        farmerRef: formatFarmerRef(centre.code, m.farmerNumber),
        joinedOn: m.joinedOn,
      };
    }),
    pluckers: state.pluckers.filter((p) => p.farmerUuids.includes(farmerUuid)).map(pluckerRef),
    qrSeed: fnv1a64(farmer.readableId),
  };
}
