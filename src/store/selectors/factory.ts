/**
 * Factory-scoped selectors. Every function takes a `factoryUuid` and never returns
 * another factory's memberships, deliveries, disputes or plucker sessions. For example
 * Tegat never sees the demo farmer's Toror membership (TR-012 / 0456).
 *
 * For Tegat (detail level `full`) figures are "unlisted background + listed ledger";
 * for other factories they come from the stored aggregate.
 */
import type {
  AppState,
  BonusRecalculation,
  BonusReport,
  BuyingCentre,
  CentreDetail,
  CentreSummary,
  Delivery,
  DeliveryDetail,
  DeliveryFilters,
  DeliveryRow,
  DisputeDetail,
  DisputeRow,
  DisputeStatus,
  Factory,
  FactoryAlert,
  FactoryDashboard,
  FactoryFarmerDetail,
  FactoryFarmerRow,
  FactoryOverview,
  FactoryPluckerDetail,
  FactoryPluckerRow,
  FactoryProfile,
  FarmerBonus,
  FarmerQualityRow,
  IsoDate,
  IsoDateTime,
  Membership,
  MonthKey,
  MonthlyFigure,
  PluckerSession,
  QualityReport,
  Uuid,
} from '../../types';
import { compareWithDeclared, computeBonus } from '../../lib/bonus';
import { changeBetween, formatAgeDays } from '../../lib/format';
import { formatFarmerRef, parseFarmerRef, sameFarmerNumber } from '../../lib/ids';
import { sumKg, weightedPct } from '../../lib/kg';
import { deliveryDisplayId } from '../../lib/ledger';
import {
  FINE_LEAF_TARGET,
  addDays,
  addMonths,
  dateKeyOf,
  daysBetween,
  daysInMonth,
  hoursBetween,
  lastMonths,
  monthKeyOf,
} from '../../lib/time';
import {
  byRecordedDesc,
  centreRef,
  factoryRef,
  farmerRefFor,
  indexOf,
  isReceived,
  must,
  pluckerRef,
  toDeliveryDetail,
  toDeliveryRow,
} from './common';
import { farmerBonusAt, monthlyPayment } from './payments';

export const PLUCKING_TIPS: readonly string[] = [
  'Pick two leaves and a bud. Leave the coarse third leaf and the stalk on the bush.',
  'Pluck every 7 to 10 days so shoots do not grow coarse between rounds.',
  'Carry leaf in an open woven basket, not a sack, and never press it down.',
  'Keep plucked leaf in the shade and bring it to the centre the same morning.',
  'Do not pack wet leaf tightly; it heats up and bruises on the way.',
];

const r1 = (n: number): number => Math.round(n * 10) / 10;

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function centreLedger(state: AppState, centreUuid: Uuid): Delivery[] {
  return state.deliveries.filter((d) => d.centreUuid === centreUuid && isReceived(d));
}

function figureFrom(month: MonthKey, bg: MonthlyFigure | undefined, entries: readonly Delivery[]): MonthlyFigure {
  const kg = sumKg([bg ? bg.kg : 0, ...entries.map((e) => e.kg)]);
  const fine = weightedPct([...(bg ? [{ kg: bg.kg, pct: bg.fineLeafPct }] : []), ...entries.map((e) => ({ kg: e.kg, pct: e.fineLeafPct }))]);
  const intake = weightedPct([
    ...(bg ? [{ kg: bg.kg, pct: bg.intakeFineLeafPct }] : []),
    ...entries.filter((e) => e.intakeFineLeafPct !== null).map((e) => ({ kg: e.kg, pct: e.intakeFineLeafPct ?? 0 })),
  ]);
  return {
    month,
    kg,
    deliveries: (bg ? bg.deliveries : 0) + entries.filter((e) => e.kg > 0).length - entries.filter((e) => e.kg < 0).length,
    fineLeafPct: fine ?? 0,
    intakeFineLeafPct: intake ?? fine ?? 0,
  };
}

function centreMonths(state: AppState, centre: BuyingCentre, months: readonly MonthKey[]): MonthlyFigure[] {
  const ledger = centreLedger(state, centre.uuid);
  return months.map((month) =>
    figureFrom(
      month,
      centre.background?.months.find((m) => m.month === month),
      ledger.filter((d) => monthKeyOf(d.recordedAt) === month),
    ),
  );
}

function mergeMonths(series: ReadonlyArray<readonly MonthlyFigure[]>, months: readonly MonthKey[]): MonthlyFigure[] {
  return months.map((month, i) => {
    const parts = series.map((s) => s[i]).filter((x): x is MonthlyFigure => x !== undefined);
    return {
      month,
      kg: sumKg(parts.map((p) => p.kg)),
      deliveries: parts.reduce((a, p) => a + p.deliveries, 0),
      fineLeafPct: weightedPct(parts.map((p) => ({ kg: p.kg, pct: p.fineLeafPct }))) ?? 0,
      intakeFineLeafPct: weightedPct(parts.map((p) => ({ kg: p.kg, pct: p.intakeFineLeafPct }))) ?? 0,
    };
  });
}

/** Kilos from the 1st of last month up to the same day-of-month as today. */
function lastMonthToDate(state: AppState, centre: BuyingCentre, today: IsoDate): number {
  const prev = addMonths(monthKeyOf(today), -1);
  const dom = Number(today.slice(8, 10));
  const bg = centre.background?.months.find((m) => m.month === prev);
  const bgPart = bg ? Math.round(bg.kg * Math.min(1, dom / daysInMonth(prev))) : 0;
  const ledger = centreLedger(state, centre.uuid).filter((d) => monthKeyOf(d.recordedAt) === prev && Number(dateKeyOf(d.recordedAt).slice(8, 10)) <= dom);
  return sumKg([bgPart, ...ledger.map((d) => d.kg)]);
}

/** Centres of a factory, in code order. */
export function centresOf(state: AppState, factoryUuid: Uuid): BuyingCentre[] {
  return state.centres.filter((c) => c.factoryUuid === factoryUuid).sort((a, b) => (a.code < b.code ? -1 : 1));
}

/* ------------------------------------------------------------------ */
/* Centres                                                             */
/* ------------------------------------------------------------------ */

export function selectCentreSummary(state: AppState, centreUuid: Uuid, now: IsoDateTime): CentreSummary {
  const idx = indexOf(state);
  const centre = must(idx.centres.get(centreUuid), 'Centre');
  const device = must(idx.devices.get(centre.deviceId), 'Device');
  const clerk = idx.staff.get(centre.clerkUuid);
  const today = dateKeyOf(now);
  const month = monthKeyOf(today);
  const ledger = centreLedger(state, centre.uuid);
  const current = figureFrom(month, centre.background?.months.find((m) => m.month === month), ledger.filter((d) => monthKeyOf(d.recordedAt) === month));
  const todayEntries = ledger.filter((d) => dateKeyOf(d.recordedAt) === today);
  const listed = (idx.membershipsByCentre.get(centre.uuid) ?? []).length;
  const listedPending = state.deliveries.filter((d) => d.deviceId === device.deviceId && d.status === 'pending').length;
  return {
    ...centreRef(centre),
    clerkName: clerk ? clerk.name : '—',
    clerkUuid: centre.clerkUuid,
    farmerCount: listed + (centre.background?.unlistedFarmerCount ?? 0),
    listedFarmerCount: listed,
    kgToday: sumKg([centre.background?.kgToday ?? 0, ...todayEntries.map((d) => d.kg)]),
    deliveriesToday: (centre.background?.deliveriesToday ?? 0) + todayEntries.filter((d) => d.kg > 0).length,
    kgThisMonth: current.kg,
    quality: {
      centreFineLeafPct: current.fineLeafPct,
      intakeFineLeafPct: current.intakeFineLeafPct,
      gapPts: r1(current.fineLeafPct - current.intakeFineLeafPct),
    },
    connectivity: {
      status: device.online ? 'online' : 'offline',
      offlineHours: device.offlineSince ? Math.max(0, hoursBetween(device.offlineSince, now)) : 0,
      offlineSince: device.offlineSince,
      pendingCount: listedPending + device.unlistedPendingCount,
      listedPendingCount: listedPending,
      unlistedPendingCount: device.unlistedPendingCount,
      lastSyncAt: device.lastSyncAt,
      deviceId: device.deviceId,
    },
  };
}

export function selectCentres(state: AppState, factoryUuid: Uuid, now: IsoDateTime): CentreSummary[] {
  return centresOf(state, factoryUuid).map((c) => selectCentreSummary(state, c.uuid, now));
}

export function selectCentreDetail(state: AppState, factoryUuid: Uuid, centreUuid: Uuid, now: IsoDateTime): CentreDetail | null {
  const centre = indexOf(state).centres.get(centreUuid);
  if (!centre || centre.factoryUuid !== factoryUuid) return null;
  return {
    ...selectCentreSummary(state, centreUuid, now),
    deliveries: selectFactoryDeliveries(state, factoryUuid, { centreUuid, limit: 50 }),
    farmers: selectFactoryFarmers(state, factoryUuid, { centreUuid }, now),
    months: centreMonths(state, centre, lastMonths(monthKeyOf(dateKeyOf(now)), 6)),
  };
}

/* ------------------------------------------------------------------ */
/* Factory overview (shared with the county)                           */
/* ------------------------------------------------------------------ */

export function selectFactoryOverview(state: AppState, factoryUuid: Uuid, now: IsoDateTime): FactoryOverview {
  const factory = must(indexOf(state).factories.get(factoryUuid), 'Factory');
  const today = dateKeyOf(now);
  const month = monthKeyOf(today);
  const months = lastMonths(month, 6);
  const base = {
    ...factoryRef(factory),
    detailLevel: factory.detailLevel,
    logoDataUrl: factory.logoDataUrl,
    avgAuctionPriceCentsPerKg: factory.avgAuctionPriceCentsPerKg,
    bonusPerKgCents: factory.bonus.declaredPerKgCents,
    chain: factory.chain,
  };

  if (factory.detailLevel === 'aggregate' && factory.aggregate) {
    const a = factory.aggregate;
    const current = a.months[a.months.length - 1];
    const prev = a.months[a.months.length - 2];
    const prevToDate = prev ? Math.round(prev.kg * Math.min(1, Number(today.slice(8, 10)) / daysInMonth(prev.month))) : 0;
    const kgThisMonth = current ? current.kg : 0;
    return {
      ...base,
      farmerCount: a.farmerCount,
      centreCount: a.centres.length,
      kgToday: a.kgToday,
      kgThisMonth,
      kgLastMonthToDate: prevToDate,
      changeVsLastMonth: changeBetween(kgThisMonth, prevToDate),
      fineLeafPct: current ? current.fineLeafPct : 0,
      intakeFineLeafPct: current ? current.intakeFineLeafPct : 0,
      openDisputes: a.openDisputes,
      disputeRatePct: a.farmerCount > 0 ? Math.round((a.openDisputes / a.farmerCount) * 10000) / 100 : 0,
      lastSyncAt: a.lastSyncAt,
      offlineCentreCount: a.offlineCentreCount,
      pendingSyncCount: a.pendingSyncCount,
      trend: a.months.slice(-6),
    };
  }

  const centres = centresOf(state, factory.uuid);
  const summaries = centres.map((c) => selectCentreSummary(state, c.uuid, now));
  const trend = mergeMonths(centres.map((c) => centreMonths(state, c, months)), months);
  const current = trend[trend.length - 1];
  const kgThisMonth = current ? current.kg : 0;
  const kgLastMonthToDate = sumKg(centres.map((c) => lastMonthToDate(state, c, today)));
  const farmerCount = summaries.reduce((a, s) => a + s.farmerCount, 0);
  const openDisputes = state.disputes.filter((d) => d.factoryUuid === factory.uuid && d.status === 'open').length;
  const lastSyncAt = summaries.reduce((acc, s) => (s.connectivity.lastSyncAt > acc ? s.connectivity.lastSyncAt : acc), '');
  return {
    ...base,
    farmerCount,
    centreCount: centres.length,
    kgToday: sumKg(summaries.map((s) => s.kgToday)),
    kgThisMonth,
    kgLastMonthToDate,
    changeVsLastMonth: changeBetween(kgThisMonth, kgLastMonthToDate),
    fineLeafPct: current ? current.fineLeafPct : 0,
    intakeFineLeafPct: current ? current.intakeFineLeafPct : 0,
    openDisputes,
    disputeRatePct: farmerCount > 0 ? Math.round((openDisputes / farmerCount) * 10000) / 100 : 0,
    lastSyncAt,
    offlineCentreCount: summaries.filter((s) => s.connectivity.status === 'offline').length,
    pendingSyncCount: summaries.reduce((a, s) => a + s.connectivity.pendingCount, 0),
    trend,
  };
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export function offlineMessage(code: string, name: string, hours: number, pending: number): string {
  const time = hours < 1 ? 'has just gone offline' : `has been offline for ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const waiting = pending === 0 ? 'No deliveries are waiting to sync.' : `${pending} ${pending === 1 ? 'delivery is' : 'deliveries are'} waiting to sync.`;
  return `${code} ${name} ${time}. ${waiting}`;
}

export function selectFactoryDashboard(state: AppState, factoryUuid: Uuid, now: IsoDateTime): FactoryDashboard {
  const overview = selectFactoryOverview(state, factoryUuid, now);
  const centres = selectCentres(state, factoryUuid, now);
  const alerts: FactoryAlert[] = centres
    .filter((c) => c.connectivity.status === 'offline')
    .map((c) => ({
      kind: 'centre_offline',
      centreUuid: c.uuid,
      centreCode: c.code,
      centreName: c.name,
      offlineHours: c.connectivity.offlineHours,
      pendingCount: c.connectivity.pendingCount,
      message: offlineMessage(c.code, c.name, c.connectivity.offlineHours, c.connectivity.pendingCount),
    }));
  const since = addDays(dateKeyOf(now), -30);
  const activeListed = new Set(
    state.deliveries.filter((d) => d.factoryUuid === factoryUuid && isReceived(d) && dateKeyOf(d.recordedAt) >= since).map((d) => d.membershipUuid),
  ).size;
  const unlisted = centresOf(state, factoryUuid).reduce((a, c) => a + (c.background?.unlistedFarmerCount ?? 0), 0);
  return {
    factory: overview,
    activeFarmers: activeListed + unlisted,
    alerts,
    centres,
    recentDeliveries: selectFactoryDeliveries(state, factoryUuid, { limit: 10 }),
    pendingByCentre: Object.fromEntries(centres.map((c) => [c.code, c.connectivity.pendingCount])),
  };
}

/* ------------------------------------------------------------------ */
/* Deliveries                                                          */
/* ------------------------------------------------------------------ */

/** Search across farmer name, TwoLeaf IDs (full or short), delivery / temp ID, plucker, or `TG-043 / 123`. */
export function rowMatchesSearch(row: DeliveryRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const ref = parseFarmerRef(q);
  if (ref) {
    if (ref.centreCode) return row.centre.code === ref.centreCode && sameFarmerNumber(row.farmer.farmerNumber, ref.farmerNumber);
    if (sameFarmerNumber(row.farmer.farmerNumber, ref.farmerNumber)) return true;
  }
  return (
    row.farmer.name.toLowerCase().includes(q) ||
    row.farmer.readableId.toLowerCase().includes(q) ||
    row.displayId.toLowerCase().includes(q) ||
    (row.plucker !== null && row.plucker.name.toLowerCase().includes(q))
  );
}

export function selectFactoryDeliveries(state: AppState, factoryUuid: Uuid, filters: DeliveryFilters = {}): DeliveryRow[] {
  const list = state.deliveries
    .filter((d) => d.factoryUuid === factoryUuid)
    .filter((d) => !filters.centreUuid || d.centreUuid === filters.centreUuid)
    .filter((d) => !filters.status || d.status === filters.status)
    .filter((d) => !filters.farmerUuid || d.farmerUuid === filters.farmerUuid)
    .filter((d) => !filters.pluckerUuid || d.pluckerUuid === filters.pluckerUuid)
    .filter((d) => !filters.from || dateKeyOf(d.recordedAt) >= filters.from)
    .filter((d) => !filters.to || dateKeyOf(d.recordedAt) <= filters.to)
    .sort(byRecordedDesc)
    .map((d) => toDeliveryRow(state, d))
    .filter((row) => !filters.search || rowMatchesSearch(row, filters.search));
  return filters.limit ? list.slice(0, filters.limit) : list;
}

export function selectFactoryDelivery(state: AppState, factoryUuid: Uuid, deliveryUuid: Uuid): DeliveryDetail | null {
  const d = indexOf(state).deliveries.get(deliveryUuid);
  if (!d || d.factoryUuid !== factoryUuid) return null;
  return toDeliveryDetail(state, d, factoryUuid);
}

/* ------------------------------------------------------------------ */
/* Farmers                                                             */
/* ------------------------------------------------------------------ */

function farmerRow(state: AppState, m: Membership, today: IsoDate): FactoryFarmerRow {
  const idx = indexOf(state);
  const farmer = must(idx.farmers.get(m.farmerUuid), 'Farmer');
  const centre = must(idx.centres.get(m.centreUuid), 'Centre');
  const month = monthKeyOf(today);
  const own = state.deliveries.filter((d) => d.membershipUuid === m.uuid && isReceived(d));
  const thisMonth = own.filter((d) => monthKeyOf(d.recordedAt) === month);
  const last = own.reduce<string | null>((acc, d) => (acc === null || d.recordedAt > acc ? d.recordedAt : acc), null);
  return {
    farmer: farmerRefFor(state, m),
    centre: centreRef(centre),
    phone: farmer.phone,
    kgThisMonth: sumKg(thisMonth.map((d) => d.kg)),
    fineLeafPct: weightedPct(thisMonth.map((d) => ({ kg: d.kg, pct: d.fineLeafPct }))),
    membershipStatus: m.status,
    active: last !== null && daysBetween(last, today) <= 30,
    lastDeliveryAt: last,
  };
}

export function selectFactoryFarmers(
  state: AppState,
  factoryUuid: Uuid,
  filters: { centreUuid?: Uuid; search?: string },
  now: IsoDateTime,
): FactoryFarmerRow[] {
  const today = dateKeyOf(now);
  const q = (filters.search ?? '').trim().toLowerCase();
  const ref = q ? parseFarmerRef(q) : null;
  return state.memberships
    .filter((m) => m.factoryUuid === factoryUuid)
    .filter((m) => !filters.centreUuid || m.centreUuid === filters.centreUuid)
    .map((m) => farmerRow(state, m, today))
    .filter((row) => {
      if (!q) return true;
      if (ref) {
        if (ref.centreCode) return row.centre.code === ref.centreCode && sameFarmerNumber(row.farmer.farmerNumber, ref.farmerNumber);
        if (sameFarmerNumber(row.farmer.farmerNumber, ref.farmerNumber)) return true;
      }
      return (
        row.farmer.name.toLowerCase().includes(q) ||
        row.farmer.readableId.toLowerCase().includes(q) ||
        row.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
      );
    })
    .sort((a, b) => (a.centre.code === b.centre.code ? a.farmer.farmerNumber.localeCompare(b.farmer.farmerNumber) : a.centre.code < b.centre.code ? -1 : 1));
}

export function selectFactoryFarmerDetail(state: AppState, factoryUuid: Uuid, farmerUuid: Uuid, now: IsoDateTime): FactoryFarmerDetail | null {
  const idx = indexOf(state);
  const farmer = idx.farmers.get(farmerUuid);
  if (!farmer) return null;
  // Only this factory's memberships. Other factories' memberships are invisible here.
  const memberships = (idx.membershipsByFarmer.get(farmerUuid) ?? []).filter((m) => m.factoryUuid === factoryUuid);
  if (memberships.length === 0) return null;
  const ids = new Set(memberships.map((m) => m.uuid));
  const today = dateKeyOf(now);
  const months = lastMonths(monthKeyOf(today), 6);
  const own = state.deliveries.filter((d) => ids.has(d.membershipUuid));
  const received = own.filter(isReceived);
  return {
    farmer: { uuid: farmer.uuid, readableId: farmer.readableId, name: farmer.name, phone: farmer.phone, nationalId: farmer.nationalId, joinedOn: farmer.joinedOn },
    memberships: memberships.map((m) => {
      const centre = must(idx.centres.get(m.centreUuid), 'Centre');
      return { membershipUuid: m.uuid, centre: centreRef(centre), farmerNumber: m.farmerNumber, farmerRef: formatFarmerRef(centre.code, m.farmerNumber), joinedOn: m.joinedOn, status: m.status };
    }),
    trend: months.map((month) => figureFrom(month, undefined, received.filter((d) => monthKeyOf(d.recordedAt) === month))),
    deliveries: own.slice().sort(byRecordedDesc).map((d) => toDeliveryRow(state, d)),
    payments: memberships.flatMap((m) => months.slice().reverse().map((month) => monthlyPayment(state, m, month, today, 'received'))),
    bonus: farmerBonusAt(state, factoryUuid, memberships, today, 'received'),
    disputes: selectFactoryDisputes(state, factoryUuid, {}, now).filter((d) => d.farmer.uuid === farmerUuid),
    // Pluckers linked to this farmer, or with a session on this farmer's deliveries at this factory only.
    pluckers: state.pluckers
      .filter((p) => p.farmerUuids.includes(farmerUuid) || own.some((d) => d.pluckerUuid === p.uuid && d.factoryUuid === factoryUuid))
      .map(pluckerRef),
  };
}

/* ------------------------------------------------------------------ */
/* Pluckers                                                            */
/* ------------------------------------------------------------------ */

export function toSession(state: AppState, d: Delivery): PluckerSession {
  const idx = indexOf(state);
  const centre = must(idx.centres.get(d.centreUuid), 'Centre');
  const factory = must(idx.factories.get(d.factoryUuid), 'Factory');
  const farmer = must(idx.farmers.get(d.farmerUuid), 'Farmer');
  return {
    deliveryUuid: d.uuid,
    displayId: deliveryDisplayId(d),
    recordedAt: d.recordedAt,
    farmerName: farmer.name,
    farmerUuid: farmer.uuid,
    centre: centreRef(centre),
    factoryShortName: factory.shortName,
    kg: d.kg,
    fineLeafPct: d.fineLeafPct,
    status: d.status,
  };
}

function factoryPluckerRow(state: AppState, factoryUuid: Uuid, pluckerUuid: Uuid, now: IsoDateTime): FactoryPluckerDetail | null {
  const idx = indexOf(state);
  const p = idx.pluckers.get(pluckerUuid);
  if (!p) return null;
  const sessions = state.deliveries
    .filter((d) => d.pluckerUuid === p.uuid && d.factoryUuid === factoryUuid && (d.status === 'synced' || d.status === 'pending'))
    .sort(byRecordedDesc);
  const farmers = p.farmerUuids
    .map((fu) => (idx.membershipsByFarmer.get(fu) ?? []).find((m) => m.factoryUuid === factoryUuid))
    .filter((m): m is Membership => m !== undefined)
    .map((m) => farmerRefFor(state, m));
  if (sessions.length === 0 && farmers.length === 0) return null;
  const month = monthKeyOf(dateKeyOf(now));
  const thisMonth = sessions.filter((d) => monthKeyOf(d.recordedAt) === month);
  return {
    ...pluckerRef(p),
    phone: p.phone,
    farmers,
    sessionsThisMonth: thisMonth.length,
    kgThisMonth: sumKg(thisMonth.map((d) => d.kg)),
    avgFineLeafPct: weightedPct(thisMonth.map((d) => ({ kg: d.kg, pct: d.fineLeafPct }))),
    sessions: sessions.map((d) => toSession(state, d)),
  };
}

export function selectFactoryPluckers(state: AppState, factoryUuid: Uuid, now: IsoDateTime): FactoryPluckerRow[] {
  return state.pluckers
    .map((p) => factoryPluckerRow(state, factoryUuid, p.uuid, now))
    .filter((r): r is FactoryPluckerDetail => r !== null)
    .map(({ sessions: _sessions, ...row }) => row)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function selectFactoryPluckerDetail(state: AppState, factoryUuid: Uuid, pluckerUuid: Uuid, now: IsoDateTime): FactoryPluckerDetail | null {
  return factoryPluckerRow(state, factoryUuid, pluckerUuid, now);
}

/* ------------------------------------------------------------------ */
/* Quality                                                             */
/* ------------------------------------------------------------------ */

export function selectQualityReport(state: AppState, factoryUuid: Uuid, now: IsoDateTime): QualityReport {
  const overview = selectFactoryOverview(state, factoryUuid, now);
  const centres = selectCentres(state, factoryUuid, now);
  const month = monthKeyOf(dateKeyOf(now));
  const rows: FarmerQualityRow[] = state.memberships
    .filter((m) => m.factoryUuid === factoryUuid)
    .map((m) => {
      const entries = state.deliveries.filter((d) => d.membershipUuid === m.uuid && isReceived(d) && monthKeyOf(d.recordedAt) === month);
      const pct = weightedPct(entries.map((d) => ({ kg: d.kg, pct: d.fineLeafPct })));
      const centre = must(indexOf(state).centres.get(m.centreUuid), 'Centre');
      return pct === null ? null : { farmer: farmerRefFor(state, m), centreCode: centre.code, kg: sumKg(entries.map((d) => d.kg)), fineLeafPct: pct };
    })
    .filter((r): r is FarmerQualityRow => r !== null);
  const sorted = rows.slice().sort((a, b) => b.fineLeafPct - a.fineLeafPct || b.kg - a.kg);
  return {
    target: FINE_LEAF_TARGET,
    factoryFineLeafPct: overview.fineLeafPct,
    factoryIntakeFineLeafPct: overview.intakeFineLeafPct,
    centres: centres.map((c) => ({ ...centreRef(must(indexOf(state).centres.get(c.uuid), 'Centre')), ...c.quality, kgThisMonth: c.kgThisMonth })),
    topFarmers: sorted.slice(0, 5),
    bottomFarmers: sorted.slice().reverse().slice(0, 5),
    tips: PLUCKING_TIPS.slice(),
  };
}

/* ------------------------------------------------------------------ */
/* Bonus                                                               */
/* ------------------------------------------------------------------ */

export function selectBonusReport(state: AppState, factoryUuid: Uuid): BonusReport {
  const factory = must(indexOf(state).factories.get(factoryUuid), 'Factory');
  const inputs = factory.bonus.inputs;
  return { factory: factoryRef(factory), declaration: factory.bonus, inputs, computation: inputs ? computeBonus(inputs) : null };
}

/** Recompute from saved inputs and compare with the declared figure. Null when no inputs are held. */
export function selectBonusRecalculation(state: AppState, factoryUuid: Uuid): BonusRecalculation | null {
  const factory: Factory = must(indexOf(state).factories.get(factoryUuid), 'Factory');
  if (!factory.bonus.inputs) return null;
  const computation = computeBonus(factory.bonus.inputs);
  const cmp = compareWithDeclared(computation.bonusPerKgCents, factory.bonus.declaredPerKgCents);
  return {
    computedPerKgCents: computation.bonusPerKgCents,
    declaredPerKgCents: factory.bonus.declaredPerKgCents,
    differenceCents: cmp.differenceCents,
    matches: cmp.matches,
    message: cmp.message,
    computation,
  };
}

export function selectFactoryFarmerBonus(state: AppState, factoryUuid: Uuid, farmerUuid: Uuid, now: IsoDateTime): FarmerBonus | null {
  const memberships = (indexOf(state).membershipsByFarmer.get(farmerUuid) ?? []).filter((m) => m.factoryUuid === factoryUuid);
  return farmerBonusAt(state, factoryUuid, memberships, dateKeyOf(now), 'received');
}

/* ------------------------------------------------------------------ */
/* Disputes                                                            */
/* ------------------------------------------------------------------ */

export function toDisputeRow(state: AppState, disputeUuid: Uuid, now: IsoDateTime): DisputeRow {
  const idx = indexOf(state);
  const d = must(idx.disputes.get(disputeUuid), 'Dispute');
  const m = must(idx.memberships.get(d.membershipUuid), 'Membership');
  const centre = must(idx.centres.get(d.centreUuid), 'Centre');
  const daysToDeadline = daysBetween(now, d.deadlineAt);
  return {
    uuid: d.uuid,
    readableId: d.readableId,
    farmer: farmerRefFor(state, m),
    centre: centreRef(centre),
    reason: d.reason,
    openedAt: d.openedAt,
    deadlineAt: d.deadlineAt,
    daysToDeadline,
    deadlineSoon: d.status === 'open' && daysToDeadline <= 2,
    status: d.status,
    resolution: d.resolution
      ? { outcome: d.resolution.outcome, note: d.resolution.note, resolvedAt: d.resolution.resolvedAt, byName: d.resolution.byName }
      : null,
  };
}

export function selectFactoryDisputes(state: AppState, factoryUuid: Uuid, filters: { status?: DisputeStatus }, now: IsoDateTime): DisputeRow[] {
  return state.disputes
    .filter((d) => d.factoryUuid === factoryUuid)
    .filter((d) => !filters.status || d.status === filters.status)
    .sort((a, b) => {
      // Open first (oldest first), then resolved (newest first).
      if ((a.status === 'open') !== (b.status === 'open')) return a.status === 'open' ? -1 : 1;
      if (a.status === 'open') return a.openedAt < b.openedAt ? -1 : 1;
      return a.openedAt < b.openedAt ? 1 : -1;
    })
    .map((d) => toDisputeRow(state, d.uuid, now));
}

export function selectFactoryDispute(state: AppState, factoryUuid: Uuid, disputeUuid: Uuid, now: IsoDateTime): DisputeDetail | null {
  const idx = indexOf(state);
  const d = idx.disputes.get(disputeUuid);
  if (!d || d.factoryUuid !== factoryUuid) return null;
  const delivery = d.deliveryUuid ? idx.deliveries.get(d.deliveryUuid) : undefined;
  const corrected = d.resolution?.correctedDeliveryUuid ? idx.deliveries.get(d.resolution.correctedDeliveryUuid) : undefined;
  const reversal = d.resolution?.reversalUuid ? idx.deliveries.get(d.resolution.reversalUuid) : undefined;
  return {
    ...toDisputeRow(state, d.uuid, now),
    farmerNote: d.farmerNote,
    delivery: delivery && delivery.factoryUuid === factoryUuid ? toDeliveryDetail(state, delivery, factoryUuid) : null,
    correctedDelivery: corrected ? toDeliveryRow(state, corrected) : null,
    reversal: reversal ? toDeliveryRow(state, reversal) : null,
  };
}

/** "Open, 2 days" helper for queues. */
export function disputeAge(openedAt: IsoDateTime, now: IsoDateTime): string {
  return formatAgeDays(openedAt, now);
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export function selectFactoryProfile(state: AppState, factoryUuid: Uuid): FactoryProfile {
  const factory = must(indexOf(state).factories.get(factoryUuid), 'Factory');
  return {
    factory: { ...factoryRef(factory), logoDataUrl: factory.logoDataUrl, registeredOn: factory.registeredOn },
    county: { name: state.county.name, readableId: state.county.readableId, officialCode: state.county.officialCode },
    centreCount: factory.detailLevel === 'full' ? centresOf(state, factoryUuid).length : factory.aggregate?.centres.length ?? 0,
    staff: state.staff.filter((s) => s.factoryUuid === factoryUuid),
  };
}
