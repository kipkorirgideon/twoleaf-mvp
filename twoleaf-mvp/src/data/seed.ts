/**
 * Deterministic demo data (spec section 4). Every value comes from mulberry32 seeded
 * with 20261023, so every load (and every "Reset demo data") produces identical data.
 * "Now" is DEMO_NOW (Friday 23 Oct 2026, 15:00 EAT), never `new Date()`.
 *
 * All names, phone numbers and figures are invented.
 */
import type {
  AccessLogEntry,
  AppState,
  AuditPack,
  BonusDeclaration,
  BonusInputs,
  BuyingCentre,
  CentreAggregate,
  CentreBackground,
  ClerkDevice,
  County,
  Delivery,
  Dispute,
  DisputeReason,
  Factory,
  FactoryAggregate,
  Farmer,
  IsoDate,
  IsoDateTime,
  Membership,
  MonthlyFigure,
  Plucker,
  StaffRole,
  StaffUser,
  Uuid,
} from '../types';
import { computeBonus } from '../lib/bonus';
import { auditPackChecksum, deliveryHash } from '../lib/hash';
import {
  centreReadableId,
  countyReadableId,
  deliveryReadableId,
  deviceIdFor,
  disputeReadableId,
  factoryReadableId,
  farmerReadableId,
  generateUuidV7,
  pluckerReadableId,
  scaleIdFor,
  tempDeliveryId,
} from '../lib/ids';
import { roundKg, sumKg } from '../lib/kg';
import { buildSealedDays, chainAnchorHash, isInLedger, nextDeliverySeq, sealedDaysInMonth } from '../lib/ledger';
import { BONUS_DECLARED_ON, BONUS_FORMULA_VERSION, BONUS_FY, BONUS_PAID_ON, fyRange } from '../lib/rates';
import { createRng } from '../lib/rng';
import {
  DEMO_NOW_MS,
  DEMO_TODAY,
  addDays,
  addDaysIso,
  daysInMonth,
  dateKeyOf,
  dateRange,
  eatIso,
  lastMonths,
  monthKeyOf,
  toEatIso,
} from '../lib/time';

export { DEMO_NOW } from '../lib/time';
export const SEED = 20261023;

/* ------------------------------------------------------------------ */
/* Static definitions                                                  */
/* ------------------------------------------------------------------ */

interface FactoryDef {
  code: string;
  name: string;
  shortName: string;
  seq: number;
  priceCents: number;
  /** Declared bonus for aggregate-only factories (cents/kg). */
  bonusCents: number | null;
  /** This month's fine leaf % for aggregate-only factories. */
  fineLeafPct: number | null;
  centres: ReadonlyArray<readonly [string, string]>;
}

const FACTORY_DEFS: readonly FactoryDef[] = [
  { code: 'TG', name: 'Tegat Tea Factory', shortName: 'Tegat', seq: 14, priceCents: 24900, bonusCents: null, fineLeafPct: null, centres: [] },
  {
    code: 'TR', name: 'Toror Tea Factory', shortName: 'Toror', seq: 15, priceCents: 24100, bonusCents: 1580, fineLeafPct: 53,
    centres: [['TR-004', 'Cheborge'], ['TR-007', 'Roret'], ['TR-012', 'Kaptebengwet'], ['TR-015', 'Kapsorok'], ['TR-019', 'Kiptome']],
  },
  {
    code: 'MM', name: 'Momul Tea Factory', shortName: 'Momul', seq: 16, priceCents: 26200, bonusCents: 2170, fineLeafPct: 61,
    centres: [['MM-003', 'Kabianga'], ['MM-008', 'Chemamul'], ['MM-011', 'Kipchimchim'], ['MM-014', 'Kapsuser'], ['MM-020', 'Chemosot'], ['MM-022', 'Kapkures']],
  },
  {
    code: 'LT', name: 'Litein Tea Factory', shortName: 'Litein', seq: 17, priceCents: 23800, bonusCents: 1610, fineLeafPct: 52,
    centres: [['LT-002', 'Kapkatet'], ['LT-006', 'Kaplong'], ['LT-009', 'Kiptenden'], ['LT-013', 'Sigowet'], ['LT-018', 'Kipsitet']],
  },
  {
    code: 'CH', name: 'Chelal Tea Factory', shortName: 'Chelal', seq: 18, priceCents: 25100, bonusCents: 1890, fineLeafPct: 57,
    centres: [['CH-005', 'Chepseon'], ['CH-010', 'Kedowa'], ['CH-016', 'Kapkelek'], ['CH-021', 'Kapkoros']],
  },
  {
    code: 'KS', name: 'Kapset Tea Factory', shortName: 'Kapset', seq: 19, priceCents: 24600, bonusCents: 1780, fineLeafPct: 55,
    centres: [['KS-001', 'Kaptumo'], ['KS-004', 'Soliat'], ['KS-009', 'Kamasian'], ['KS-012', 'Tebesonik'], ['KS-017', 'Chemaner']],
  },
];

interface CentreDef {
  code: string;
  name: string;
  seq: number;
  clerk: string;
  fine: number;
  intake: number;
}

const TEGAT_CENTRES: readonly CentreDef[] = [
  { code: 'TG-043', name: 'Kapsoit', seq: 231, clerk: 'Geoffrey Kirui', fine: 66, intake: 63 },
  { code: 'TG-044', name: 'Ainamoi', seq: 232, clerk: 'Nancy Cheruiyot', fine: 58, intake: 55 },
  { code: 'TG-051', name: 'Kiptere', seq: 233, clerk: 'Dennis Mutai', fine: 47, intake: 43 },
  { code: 'TG-058', name: 'Sosiot', seq: 234, clerk: 'Mercy Koech', fine: 61, intake: 59 },
  { code: 'TG-062', name: 'Chesinende', seq: 235, clerk: 'Kevin Bett', fine: 54, intake: 52 },
  { code: 'TG-067', name: 'Kapkugerwet', seq: 236, clerk: 'Purity Langat', fine: 59, intake: 58 },
];

/** The 24 Tegat farmers and their centres. Fixed numbers are given where the spec names them. */
const FARMER_DEFS: ReadonlyArray<{ name: string; centre: string; number?: string }> = [
  { name: 'Kipkoech Ngetich', centre: 'TG-043', number: '123' },
  { name: 'Chepkemoi Rotich', centre: 'TG-043', number: '087' },
  { name: 'Kiprotich Langat', centre: 'TG-043', number: '132' },
  { name: 'Chebet Koech', centre: 'TG-044' },
  { name: 'Kipngeno Mutai', centre: 'TG-051' },
  { name: 'Jepkorir Bett', centre: 'TG-058' },
  { name: 'Kibet Cheruiyot', centre: 'TG-043' },
  { name: 'Cherono Sang', centre: 'TG-062' },
  { name: 'Kipkirui Kirui', centre: 'TG-067' },
  { name: 'Chepngetich Tanui', centre: 'TG-044' },
  { name: 'Kiplangat Soi', centre: 'TG-051' },
  { name: 'Jerotich Kemboi', centre: 'TG-058' },
  { name: 'Kipyegon Too', centre: 'TG-062' },
  { name: 'Chelangat Ruto', centre: 'TG-067' },
  { name: 'Kiprop Kosgei', centre: 'TG-043' },
  { name: 'Chemutai Kiplagat', centre: 'TG-044' },
  { name: 'Kipchumba Yegon', centre: 'TG-051' },
  { name: 'Chepkoech Maritim', centre: 'TG-058' },
  { name: 'Kipruto Kiptoo', centre: 'TG-043' },
  // Same number as the demo farmer, at a different centre: farmer numbers are unique per centre only.
  { name: 'Jebet Chirchir', centre: 'TG-044', number: '123' },
  { name: 'Kimutai Korir', centre: 'TG-051' },
  { name: 'Chepkurui Ngeno', centre: 'TG-058' },
  { name: 'Kipsang Rono', centre: 'TG-062' },
  { name: 'Chesang Keter', centre: 'TG-067' },
];

const PLUCKER_DEFS: ReadonlyArray<{ name: string; farmers: readonly string[] }> = [
  { name: 'Faith Chebet', farmers: ['Kipkoech Ngetich', 'Chepkemoi Rotich', 'Kibet Cheruiyot'] },
  { name: 'Brian Kiprono', farmers: ['Kipkoech Ngetich', 'Kiprotich Langat'] },
  { name: 'Mary Jepchirchir', farmers: ['Chebet Koech', 'Chepngetich Tanui'] },
  { name: 'Daniel Kipkemboi', farmers: ['Kipngeno Mutai', 'Kiplangat Soi', 'Kipchumba Yegon'] },
  { name: 'Ann Chepkirui', farmers: ['Jepkorir Bett', 'Jerotich Kemboi'] },
  { name: 'Joseph Kiptanui', farmers: ['Cherono Sang', 'Kipyegon Too'] },
  { name: 'Lilian Cherotich', farmers: ['Kipkirui Kirui', 'Chelangat Ruto', 'Chesang Keter'] },
  { name: 'Samuel Kipsigei', farmers: ['Kiprop Kosgei', 'Kipruto Kiptoo'] },
];

/** Tegat FY 2025/26 saved bonus inputs (spec section 3). The rate is computed from these. */
export const TEGAT_BONUS_INPUTS: BonusInputs = {
  formulaVersion: BONUS_FORMULA_VERSION,
  madeTeaSoldKg: 3_962_000,
  avgAuctionPriceCentsPerKg: 24_900,
  greenLeafReceivedKg: 17_830_000,
  processingCostsCents: 271_400_000_00,
  managementFeeAndLeviesCents: 26_900_000_00,
  monthlyRateCentsPerKg: 2_150,
};

/** Toror inputs, chosen so the formula reproduces its declared KSh 15.80. */
const TOROR_BONUS_INPUTS: BonusInputs = {
  formulaVersion: BONUS_FORMULA_VERSION,
  madeTeaSoldKg: 3_150_000,
  avgAuctionPriceCentsPerKg: 24_100,
  greenLeafReceivedKg: 14_200_000,
  processingCostsCents: 208_090_000_00,
  managementFeeAndLeviesCents: 21_400_000_00,
  monthlyRateCentsPerKg: 2_150,
};

/** Full-month kilos relative to October (seasonality), for May–Oct. */
const SEASON = [0.98, 0.86, 0.7, 0.74, 0.88, 1] as const;
/** Fine leaf offset by month for May–Oct (slower growth in the cold months gives finer leaf). */
const SEASON_QUALITY = [1, 2, 3, 2, 1, 0] as const;

const QUALITY_ADJUST_REASONS = [
  'Sample had wet leaf on top',
  'Coarse stalks removed from the sample',
  'Photo taken in poor light',
] as const;

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function createSeedState(): AppState {
  const rng = createRng(SEED);
  let keySeq = 1;
  const nextKey = (): number => keySeq++;
  const uuidAt = (iso: IsoDateTime | number): Uuid => generateUuidV7(typeof iso === 'number' ? iso : Date.parse(iso), rng.next);

  const months = lastMonths(monthKeyOf(DEMO_TODAY), 6);
  const dayOfMonth = Number(DEMO_TODAY.slice(8, 10));
  const monthFraction = dayOfMonth / daysInMonth(monthKeyOf(DEMO_TODAY));

  /* ---------- phones and national IDs ---------- */
  const usedPhones = new Set<string>();
  const phone = (fixedLast3?: string): string => {
    for (;;) {
      const p2 = rng.pick(['10', '11', '12', '13', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '40', '41', '42', '45', '46', '48', '57', '58', '59', '68', '69', '79']);
      const s = `07${p2} ${rng.int(100, 999)} ${fixedLast3 ?? rng.int(100, 999)}`;
      if (!usedPhones.has(s)) {
        usedPhones.add(s);
        return s;
      }
    }
  };
  const nationalId = (): string => String(rng.int(10_000_000, 38_999_999));

  /* ---------- county ---------- */
  const county: County = {
    key: nextKey(),
    uuid: uuidAt('2024-03-01T09:00:00.000+03:00'),
    readableId: countyReadableId(),
    name: 'Kericho County Government',
    shortName: 'Kericho',
    officialCode: '035',
    regionCode: 'KCO',
    regionalPrices: {
      periodLabel: 'Jan–Sep 2025',
      westOfRiftCentsPerKg: 22_600,
      eastOfRiftCentsPerKg: 38_000,
      note: 'West of Rift tea sells for far less at auction, so every point of fine leaf that lifts the price matters more to Kericho farmers.',
    },
  };

  /* ---------- staff ---------- */
  const staff: StaffUser[] = [];
  const addStaff = (name: string, role: StaffRole, title: string, factoryUuid: Uuid | null, centreUuid: Uuid | null): StaffUser => {
    const s: StaffUser = {
      uuid: uuidAt('2025-06-01T09:00:00.000+03:00'),
      name,
      role,
      title,
      countyUuid: county.uuid,
      factoryUuid,
      centreUuid,
      phone: phone(),
    };
    staff.push(s);
    return s;
  };
  const countyOfficer = addStaff('Agnes Kosgey', 'county_officer', 'County agriculture officer', null, null);
  const countyAuditor = addStaff('Wesley Biwott', 'county_auditor', 'County auditor', null, null);

  /* ---------- factories ---------- */
  const factories: Factory[] = [];
  const centres: BuyingCentre[] = [];
  const devices: ClerkDevice[] = [];

  const verifiedAt = eatIso(DEMO_TODAY, 6, 0);

  const makeDeclaration = (inputs: BonusInputs | null, declaredCents: number): BonusDeclaration => {
    const range = fyRange(BONUS_FY);
    return {
      fy: BONUS_FY,
      fyStart: range.from,
      fyEnd: range.to,
      formulaVersion: inputs ? inputs.formulaVersion : null,
      declaredPerKgCents: declaredCents,
      declaredOn: BONUS_DECLARED_ON,
      paidOn: BONUS_PAID_ON,
      inputs,
    };
  };

  const monthSeries = (fullOctKg: number, fine: number, gap: number, currentKg: number): MonthlyFigure[] =>
    months.map((month, i) => {
      const isCurrent = i === months.length - 1;
      const kg = isCurrent ? currentKg : Math.round(fullOctKg * (SEASON[i] ?? 1) * (0.96 + rng.next() * 0.08));
      const f = isCurrent ? fine : clamp(fine + (SEASON_QUALITY[i] ?? 0) + rng.int(-1, 1), 30, 85);
      const intake = isCurrent ? fine - gap : f - gap + rng.int(-1, 1);
      return { month, kg, deliveries: Math.round(kg / rng.int(29, 35)), fineLeafPct: f, intakeFineLeafPct: intake };
    });

  for (const def of FACTORY_DEFS) {
    const uuid = uuidAt('2024-06-01T09:00:00.000+03:00');
    const isTegat = def.code === 'TG';
    let aggregate: FactoryAggregate | null = null;
    if (!isTegat) {
      const fine = def.fineLeafPct ?? 55;
      const farmerCount = def.code === 'LT' ? 1052 : rng.int(900, 1500);
      const kgThisMonth = rng.int(180_000, 320_000);
      const fullOct = kgThisMonth / monthFraction;
      const gap = rng.int(2, 4);
      // Centre split, then shift fine leaf so the kg-weighted mean equals the factory figure.
      const weights = def.centres.map(() => 0.7 + rng.next() * 0.6);
      const wSum = weights.reduce((a, b) => a + b, 0);
      const offsets = def.centres.map(() => rng.int(-5, 5));
      const meanOffset = offsets.reduce((a, o, i) => a + o * (weights[i] ?? 0), 0) / wSum;
      const centreAggs: CentreAggregate[] = def.centres.map(([code, name], i) => {
        const w = (weights[i] ?? 1) / wSum;
        const cf = Math.round(fine + (offsets[i] ?? 0) - meanOffset);
        return {
          code,
          name,
          farmerCount: Math.round(farmerCount * w),
          kgThisMonth: Math.round(kgThisMonth * w),
          fineLeafPct: cf,
          intakeFineLeafPct: cf - gap - rng.int(-1, 1),
        };
      });
      const openDisputes = def.code === 'LT' ? 9 : rng.int(1, 4);
      const opened = rng.int(30, 90);
      const kgToday = Math.round((fullOct / 31) * (0.85 + rng.next() * 0.15));
      aggregate = {
        farmerCount,
        centres: centreAggs,
        months: monthSeries(fullOct, fine, gap, kgThisMonth),
        kgToday,
        deliveriesToday: Math.round(kgToday / 32),
        openDisputes,
        disputesOpenedThisFy: opened,
        disputesResolvedThisFy: opened - openDisputes,
        avgDaysToResolve: Math.round((2.1 + rng.next() * 2.7) * 10) / 10,
        oldestOpenDisputeAt: toEatIso(DEMO_NOW_MS - rng.int(1, 6) * 86_400_000 - rng.int(0, 8) * 3_600_000),
        lastSyncAt: toEatIso(DEMO_NOW_MS - rng.int(5, 40) * 60_000),
        offlineCentreCount: 0,
        pendingSyncCount: 0,
      };
    }
    const inputs = isTegat ? TEGAT_BONUS_INPUTS : def.code === 'TR' ? TOROR_BONUS_INPUTS : null;
    // Declared figures for factories with saved inputs were produced by the formula in September.
    const declared = inputs ? computeBonus(inputs).bonusPerKgCents : def.bonusCents ?? 0;
    factories.push({
      key: nextKey(),
      uuid,
      readableId: factoryReadableId(def.seq),
      countyUuid: county.uuid,
      code: def.code,
      name: def.name,
      shortName: def.shortName,
      detailLevel: isTegat ? 'full' : 'aggregate',
      avgAuctionPriceCentsPerKg: def.priceCents,
      bonus: makeDeclaration(inputs, declared),
      logoDataUrl: null,
      aggregate,
      background: isTegat ? { disputesOpenedThisFy: 58, disputesResolvedThisFy: 52, totalResolveDays: 161 } : null,
      chain: { lastVerifiedAt: verifiedAt, intact: true, failedDate: null, sealedDayCount: 14 },
      registeredOn: '2025-06-15',
    });
  }

  const tegat = factories[0] as Factory;
  const toror = factories[1] as Factory;
  const unitManager = addStaff('Alfred Sigei', 'unit_manager', 'Unit manager', tegat.uuid, null);
  const factoryAuditor = addStaff('Esther Chelimo', 'factory_auditor', 'Factory auditor', tegat.uuid, null);

  /* ---------- Tegat centres (+ background) ---------- */
  const centreByCode = new Map<string, BuyingCentre>();
  const clerkByCentre = new Map<string, StaffUser>();
  for (const def of TEGAT_CENTRES) {
    const uuid = uuidAt('2025-06-15T09:00:00.000+03:00');
    const clerk = addStaff(def.clerk, 'clerk', `Clerk, ${def.code} ${def.name}`, tegat.uuid, uuid);
    const kgThisMonth = rng.int(38_000, 52_000);
    const fullOct = kgThisMonth / monthFraction;
    const offline = def.code === 'TG-051';
    const kgToday = Math.round((fullOct / 31) * (offline ? 0.55 : 0.85 + rng.next() * 0.1));
    const background: CentreBackground = {
      unlistedFarmerCount: rng.int(170, 230),
      months: monthSeries(fullOct, def.fine, def.fine - def.intake, kgThisMonth),
      kgToday,
      deliveriesToday: Math.round(kgToday / 31),
    };
    const centre: BuyingCentre = {
      key: nextKey(),
      uuid,
      readableId: centreReadableId(def.seq),
      factoryUuid: tegat.uuid,
      code: def.code,
      name: def.name,
      clerkUuid: clerk.uuid,
      deviceId: deviceIdFor(def.code, 1),
      scaleIds: [scaleIdFor(def.code, 1), scaleIdFor(def.code, 2)],
      background,
      openedOn: '2025-06-15',
    };
    centres.push(centre);
    centreByCode.set(def.code, centre);
    clerkByCentre.set(def.code, clerk);
    devices.push({
      deviceId: centre.deviceId,
      centreUuid: uuid,
      clerkUuid: clerk.uuid,
      online: !offline,
      offlineSince: offline ? eatIso(DEMO_TODAY, 12, 0) : null,
      lastSyncAt: offline ? eatIso(DEMO_TODAY, 11, 58) : toEatIso(DEMO_NOW_MS - rng.int(4, 14) * 60_000),
      tempSeq: def.code === 'TG-043' ? 6 : offline ? 14 : rng.int(2, 9),
      unlistedPendingCount: offline ? 10 : 0,
    });
  }

  /* ---------- Toror TR-012 ---------- */
  {
    const uuid = uuidAt('2025-06-15T09:00:00.000+03:00');
    const clerk = addStaff('Hillary Kimeli', 'clerk', 'Clerk, TR-012 Kaptebengwet', toror.uuid, uuid);
    const centre: BuyingCentre = {
      key: nextKey(),
      uuid,
      readableId: centreReadableId(302),
      factoryUuid: toror.uuid,
      code: 'TR-012',
      name: 'Kaptebengwet',
      clerkUuid: clerk.uuid,
      deviceId: deviceIdFor('TR-012', 1),
      scaleIds: [scaleIdFor('TR-012', 1)],
      background: null,
      openedOn: '2025-06-20',
    };
    centres.push(centre);
    centreByCode.set('TR-012', centre);
    clerkByCentre.set('TR-012', clerk);
    devices.push({
      deviceId: centre.deviceId,
      centreUuid: uuid,
      clerkUuid: clerk.uuid,
      online: true,
      offlineSince: null,
      lastSyncAt: toEatIso(DEMO_NOW_MS - 22 * 60_000),
      tempSeq: 3,
      unlistedPendingCount: 0,
    });
  }

  const centreOf = (code: string): BuyingCentre => {
    const c = centreByCode.get(code);
    if (!c) throw new Error(`Unknown centre ${code}`);
    return c;
  };

  /* ---------- farmers and memberships ---------- */
  const farmers: Farmer[] = [];
  const memberships: Membership[] = [];
  const farmerByName = new Map<string, Farmer>();
  const tegatMembershipByName = new Map<string, Membership>();
  const usedFarmerSeqs = new Set<number>([4817]);
  const usedNumbers = new Map<string, Set<string>>();
  for (const def of FARMER_DEFS) if (def.number) {
    const set = usedNumbers.get(def.centre) ?? new Set<string>();
    set.add(def.number);
    usedNumbers.set(def.centre, set);
  }

  for (const def of FARMER_DEFS) {
    const isDemo = def.name === 'Kipkoech Ngetich';
    let seq = 4817;
    if (!isDemo) {
      do seq = rng.int(1000, 9800);
      while (usedFarmerSeqs.has(seq));
      usedFarmerSeqs.add(seq);
    }
    const joinedOn: IsoDate = isDemo ? '2012-03-14' : `${rng.int(2009, 2022)}-${String(rng.int(1, 12)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`;
    const farmer: Farmer = {
      key: nextKey(),
      uuid: uuidAt(`${joinedOn}T09:00:00.000+03:00`),
      readableId: farmerReadableId(seq),
      name: def.name,
      phone: isDemo ? '0722 418 123' : phone(),
      nationalId: nationalId(),
      joinedOn,
    };
    if (isDemo) usedPhones.add(farmer.phone);
    farmers.push(farmer);
    farmerByName.set(def.name, farmer);

    let number = def.number;
    if (!number) {
      const set = usedNumbers.get(def.centre) ?? new Set<string>();
      do number = String(rng.int(1, 480)).padStart(3, '0');
      while (set.has(number));
      set.add(number);
      usedNumbers.set(def.centre, set);
    }
    const centre = centreOf(def.centre);
    const m: Membership = {
      key: nextKey(),
      uuid: uuidAt(`${joinedOn}T09:30:00.000+03:00`),
      farmerUuid: farmer.uuid,
      factoryUuid: tegat.uuid,
      centreUuid: centre.uuid,
      farmerNumber: number,
      joinedOn,
      status: 'active',
    };
    memberships.push(m);
    tegatMembershipByName.set(def.name, m);
  }

  const farmerNamed = (name: string): Farmer => {
    const f = farmerByName.get(name);
    if (!f) throw new Error(`Unknown farmer ${name}`);
    return f;
  };
  const membershipNamed = (name: string): Membership => {
    const m = tegatMembershipByName.get(name);
    if (!m) throw new Error(`No Tegat membership for ${name}`);
    return m;
  };

  const demoFarmer = farmerNamed('Kipkoech Ngetich');
  const demoTegatMembership = membershipNamed('Kipkoech Ngetich');
  const demoTororMembership: Membership = {
    key: nextKey(),
    uuid: uuidAt('2019-06-10T09:30:00.000+03:00'),
    farmerUuid: demoFarmer.uuid,
    factoryUuid: toror.uuid,
    centreUuid: centreOf('TR-012').uuid,
    farmerNumber: '0456',
    joinedOn: '2019-06-10',
    status: 'active',
  };
  memberships.push(demoTororMembership);

  /* ---------- pluckers ---------- */
  const pluckers: Plucker[] = [];
  const pluckerByName = new Map<string, Plucker>();
  const usedPluckerSeqs = new Set<number>([12094]);
  for (const def of PLUCKER_DEFS) {
    const isDemo = def.name === 'Faith Chebet';
    let seq = 12094;
    if (!isDemo) {
      do seq = rng.int(11_800, 12_400);
      while (usedPluckerSeqs.has(seq));
      usedPluckerSeqs.add(seq);
    }
    const joinedOn: IsoDate = isDemo ? '2023-02-06' : `${rng.int(2020, 2025)}-${String(rng.int(1, 12)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`;
    const p: Plucker = {
      key: nextKey(),
      uuid: uuidAt(`${joinedOn}T10:00:00.000+03:00`),
      readableId: pluckerReadableId(seq),
      name: def.name,
      phone: phone(),
      joinedOn,
      farmerUuids: def.farmers.map((n) => farmerNamed(n).uuid),
    };
    pluckers.push(p);
    pluckerByName.set(def.name, p);
  }
  const faith = pluckerByName.get('Faith Chebet') as Plucker;
  const brian = pluckerByName.get('Brian Kiprono') as Plucker;
  const pluckersForFarmer = (farmerUuid: Uuid): Plucker[] => pluckers.filter((p) => p.farmerUuids.includes(farmerUuid));

  /* ---------- deliveries ---------- */
  const deliveries: Delivery[] = [];
  const centreDefByCode = new Map(TEGAT_CENTRES.map((c) => [c.code, c]));

  interface DraftDelivery {
    membership: Membership;
    recordedAt: IsoDateTime;
    kg: number;
    fine: number;
    intake: number | null;
    plucker: Plucker | null;
    scaleId?: string;
    pending?: { tempSeq: number };
  }

  const addDelivery = (d: DraftDelivery): Delivery => {
    const centre = centres.find((c) => c.uuid === d.membership.centreUuid) as BuyingCentre;
    const clerk = clerkByCentre.get(centre.code) as StaffUser;
    const adjusted = rng.chance(0.12);
    const ai = adjusted ? clamp(d.fine + rng.pick([-4, -3, -2, 2, 3, 4]), 20, 95) : d.fine;
    const recordedMs = Date.parse(d.recordedAt);
    const delivery: Delivery = {
      key: 0, // assigned in ledger order below
      uuid: uuidAt(recordedMs),
      readableId: null,
      tempId: d.pending ? tempDeliveryId(centre.code, d.pending.tempSeq) : null,
      farmerUuid: d.membership.farmerUuid,
      membershipUuid: d.membership.uuid,
      centreUuid: centre.uuid,
      factoryUuid: centre.factoryUuid,
      recordedAt: d.recordedAt,
      enteredAt: d.pending ? null : d.recordedAt,
      kg: roundKg(d.kg),
      aiFineLeafPct: ai,
      fineLeafPct: d.fine,
      qualityAdjustReason: adjusted ? rng.pick(QUALITY_ADJUST_REASONS) : null,
      intakeFineLeafPct: d.intake,
      pluckerUuid: d.plucker ? d.plucker.uuid : null,
      clerkUuid: clerk.uuid,
      scaleId: d.scaleId ?? (centre.code === 'TG-043' ? scaleIdFor('TG-043', 2) : rng.pick(centre.scaleIds)),
      deviceId: centre.deviceId,
      photoRef: `IMG-${centre.code.replace('-', '')}-${dateKeyOf(d.recordedAt).replace(/-/g, '')}-${String(rng.int(1, 9999)).padStart(4, '0')}`,
      status: d.pending ? 'pending' : 'synced',
      hash: '',
      reversalOf: null,
      correctionOf: null,
      correction: null,
    };
    deliveries.push(delivery);
    return delivery;
  };

  const timeOn = (date: IsoDate, fromMin: number, toMin: number): IsoDateTime => {
    const mins = rng.int(fromMin, toMin);
    return eatIso(date, Math.floor(mins / 60), mins % 60, rng.int(0, 59));
  };

  const yesterday = addDays(DEMO_TODAY, -1);

  // Demo farmer: TG-043 from 1 Jul 2025 to yesterday (~45% of days), TR-012 (~15% of days).
  for (const date of dateRange('2025-07-01', yesterday)) {
    if (rng.chance(0.45)) {
      const fine = rng.int(52, 74);
      const plucker = rng.chance(0.7) ? (rng.chance(0.72) ? faith : brian) : null;
      addDelivery({
        membership: demoTegatMembership,
        recordedAt: timeOn(date, 6 * 60 + 30, 12 * 60 + 30),
        kg: rng.float1(18, 55),
        fine,
        intake: clamp(fine - rng.int(1, 5), 30, 90),
        plucker,
      });
    }
    if (rng.chance(0.15)) {
      const fine = rng.int(46, 62);
      addDelivery({
        membership: demoTororMembership,
        recordedAt: timeOn(date, 7 * 60, 11 * 60),
        kg: rng.float1(10, 30),
        fine,
        intake: clamp(fine - rng.int(1, 4), 30, 90),
        plucker: rng.chance(0.25) ? faith : null,
      });
    }
  }

  // Keep the Toror card meaningful on the farmer's Home: at least three TR-012 deliveries this month.
  const thisMonthKey = monthKeyOf(DEMO_TODAY);
  const torThisMonth = deliveries.filter((d) => d.membershipUuid === demoTororMembership.uuid && monthKeyOf(d.recordedAt) === thisMonthKey);
  for (const date of ['2026-10-06', '2026-10-13', '2026-10-20'].slice(0, Math.max(0, 3 - torThisMonth.length))) {
    const fine = rng.int(48, 60);
    addDelivery({
      membership: demoTororMembership,
      recordedAt: timeOn(date, 7 * 60, 11 * 60),
      kg: rng.float1(10, 30),
      fine,
      intake: clamp(fine - rng.int(1, 4), 30, 90),
      plucker: rng.chance(0.25) ? faith : null,
    });
  }

  // Other Tegat farmers: last 21 days (~35% of days).
  const otherTegat = FARMER_DEFS.filter((f) => f.name !== 'Kipkoech Ngetich');
  const recentDays = dateRange(addDays(DEMO_TODAY, -21), yesterday);
  const otherDelivery = (name: string, date: IsoDate, fromMin = 6 * 60 + 30, toMin = 12 * 60 + 30, pending?: { tempSeq: number }): Delivery => {
    const m = membershipNamed(name);
    const centre = centres.find((c) => c.uuid === m.centreUuid) as BuyingCentre;
    const cdef = centreDefByCode.get(centre.code) as CentreDef;
    const fine = clamp(cdef.fine + rng.int(-7, 7), 35, 82);
    const linked = pluckersForFarmer(m.farmerUuid);
    return addDelivery({
      membership: m,
      recordedAt: timeOn(date, fromMin, toMin),
      kg: rng.float1(15, 50),
      fine,
      intake: date === DEMO_TODAY ? null : clamp(fine - (cdef.fine - cdef.intake) + rng.int(-1, 1), 25, 90),
      plucker: linked.length > 0 && rng.chance(0.55) ? rng.pick(linked) : null,
      ...(pending ? { pending } : {}),
    });
  };
  for (const date of recentDays) {
    for (const def of otherTegat) if (rng.chance(0.35)) otherDelivery(def.name, date);
  }

  // Today at TG-043: 6 deliveries between 07:00 and 11:30 (intake score not in yet).
  const tg043Names = FARMER_DEFS.filter((f) => f.centre === 'TG-043').map((f) => f.name);
  const todayTimes = Array.from({ length: 6 }, () => rng.int(7 * 60, 11 * 60 + 30)).sort((a, b) => a - b);
  rng.shuffle(tg043Names).forEach((name, i) => {
    const mins = todayTimes[i] ?? 7 * 60;
    const at = eatIso(DEMO_TODAY, Math.floor(mins / 60), mins % 60, rng.int(0, 59));
    if (name === 'Kipkoech Ngetich') {
      const fine = rng.int(58, 72);
      addDelivery({ membership: demoTegatMembership, recordedAt: at, kg: rng.float1(18, 55), fine, intake: null, plucker: faith });
    } else {
      otherDelivery(name, DEMO_TODAY, mins, mins);
    }
  });

  // TG-051 offline since 12:00: its 4 listed farmers' deliveries are waiting on the device.
  const tg051Names = FARMER_DEFS.filter((f) => f.centre === 'TG-051').map((f) => f.name);
  const pendingTemps = [5, 8, 11, 14];
  const pendingTimes = Array.from({ length: 4 }, () => rng.int(12 * 60 + 5, 14 * 60 + 50)).sort((a, b) => a - b);
  rng.shuffle(tg051Names).forEach((name, i) => {
    const mins = pendingTimes[i] ?? 12 * 60 + 30;
    otherDelivery(name, DEMO_TODAY, mins, mins, { tempSeq: pendingTemps[i] ?? 14 });
  });

  // Make sure each disputed delivery exists: the latest delivery before the dispute opened.
  // Quality disputes link to the lowest-scoring delivery of the previous week.
  const latestBefore = (membership: Membership, before: IsoDateTime, lowestQuality = false): Delivery => {
    const weekBefore = addDaysIso(before, -7);
    const found = deliveries
      .filter((d) => d.membershipUuid === membership.uuid && d.status === 'synced' && d.recordedAt < before && d.recordedAt >= weekBefore)
      .sort((a, b) => (lowestQuality ? a.fineLeafPct - b.fineLeafPct : a.recordedAt < b.recordedAt ? 1 : -1))[0];
    if (found) return found;
    const name = farmers.find((f) => f.uuid === membership.farmerUuid)?.name ?? '';
    return otherDelivery(name, addDays(dateKeyOf(before), -1));
  };

  // The August mis-keyed delivery: weighed for Kipkoech (123) but keyed as 132 (Kiprotich Langat).
  const miskeyed = addDelivery({
    membership: membershipNamed('Kiprotich Langat'),
    recordedAt: eatIso('2026-08-14', 7, 42, 18),
    kg: 41.6,
    fine: 64,
    intake: 61,
    plucker: null,
    scaleId: scaleIdFor('TG-043', 2),
  });
  // Clean up generated noise on the mis-keyed entry so the story is consistent.
  miskeyed.aiFineLeafPct = 64;
  miskeyed.qualityAdjustReason = null;

  /* ---------- the upheld correction (5 Sep 2026) ---------- */
  const correctionAt = eatIso('2026-09-05', 10, 20, 0);
  const resolvedDisputeUuid = uuidAt(eatIso('2026-09-03', 7, 55));
  const correctionNote = {
    reason: 'Farmer number keyed as 132 instead of 123. Moved to the correct farmer after checking the scale log and SMS receipt.',
    byUuid: unitManager.uuid,
    byName: unitManager.name,
    at: correctionAt,
    disputeUuid: resolvedDisputeUuid,
  };
  const reversal: Delivery = {
    ...miskeyed,
    uuid: uuidAt(correctionAt),
    kg: -miskeyed.kg,
    enteredAt: correctionAt,
    status: 'reversal',
    reversalOf: miskeyed.uuid,
    correctionOf: null,
    correction: correctionNote,
  };
  const corrected: Delivery = {
    ...miskeyed,
    uuid: uuidAt(Date.parse(correctionAt) + 1000),
    farmerUuid: demoFarmer.uuid,
    membershipUuid: demoTegatMembership.uuid,
    enteredAt: eatIso('2026-09-05', 10, 20, 1),
    status: 'synced',
    reversalOf: null,
    correctionOf: miskeyed.uuid,
    correction: correctionNote,
  };
  miskeyed.status = 'corrected';
  deliveries.push(reversal, corrected);

  /* ---------- ledger order, keys, readable IDs and hashes ---------- */
  deliveries.sort((a, b) => {
    const ea = a.enteredAt ?? a.recordedAt;
    const eb = b.enteredAt ?? b.recordedAt;
    return ea < eb ? -1 : ea > eb ? 1 : 0;
  });
  const deliverySeqByYear: Record<string, number> = {};
  for (const d of deliveries) {
    d.key = nextKey();
    if (isInLedger(d) && d.enteredAt) {
      const { year, seq } = nextDeliverySeq(deliverySeqByYear, Date.parse(d.enteredAt));
      deliverySeqByYear[String(year)] = seq;
      d.readableId = deliveryReadableId(year, seq);
    }
    d.hash = deliveryHash(d);
  }

  /* ---------- disputes ---------- */
  const disputes: Dispute[] = [];
  interface DisputeDef {
    farmer: string;
    reason: DisputeReason;
    openedAt: IsoDateTime;
    seq: number;
    linked: boolean;
    note: (d: Delivery | null, m: Membership) => string;
  }
  const disputeDefs: DisputeDef[] = [
    {
      farmer: 'Jerotich Kemboi', reason: 'quality_wrong', openedAt: eatIso('2026-10-17', 16, 20), seq: 309, linked: true,
      note: (d) => `Quality score too low. The receipt says ${d?.fineLeafPct ?? 50}% but my sample was nearly all two leaves and a bud. The photo was taken in the shade.`,
    },
    {
      farmer: 'Chebet Koech', reason: 'delivery_missing', openedAt: eatIso('2026-10-19', 9, 5), seq: 312, linked: false,
      note: () => 'I delivered about 34 kg on the morning of 17 October but it is not on my statement. I have the SMS receipt.',
    },
    {
      farmer: 'Chepkemoi Rotich', reason: 'weight_wrong', openedAt: eatIso('2026-10-21', 18, 30), seq: 315, linked: true,
      note: (d) => `Weight lower than my own scale. My scale showed ${d ? (d.kg + 4.6).toFixed(1) : '40.0'} kg at home but the receipt says ${d ? d.kg.toFixed(1) : '35.4'} kg.`,
    },
    {
      farmer: 'Kiplangat Soi', reason: 'quality_wrong', openedAt: eatIso('2026-10-22', 8, 15), seq: 316, linked: true,
      note: (d) => `Quality score too low. ${d?.fineLeafPct ?? 45}% does not match my leaf; I picked two leaves and a bud only.`,
    },
    {
      farmer: 'Kipyegon Too', reason: 'wrong_farmer_number', openedAt: eatIso('2026-10-23', 8, 40), seq: 318, linked: true,
      note: (_d, m) => {
        const wrong = m.farmerNumber.split('').reverse().join('');
        const shown = wrong === m.farmerNumber ? String((Number(m.farmerNumber) % 480) + 1).padStart(3, '0') : wrong;
        return `My receipt shows farmer number TG-062 / ${shown}. My number is TG-062 / ${m.farmerNumber}.`;
      },
    },
  ];
  for (const def of disputeDefs) {
    const m = membershipNamed(def.farmer);
    const linked = def.linked ? latestBefore(m, def.openedAt, def.reason === 'quality_wrong') : null;
    disputes.push({
      key: nextKey(),
      uuid: uuidAt(def.openedAt),
      readableId: disputeReadableId(2026, def.seq),
      farmerUuid: m.farmerUuid,
      membershipUuid: m.uuid,
      centreUuid: m.centreUuid,
      factoryUuid: m.factoryUuid,
      deliveryUuid: linked ? linked.uuid : null,
      reason: def.reason,
      farmerNote: def.note(linked, m),
      openedAt: def.openedAt,
      deadlineAt: addDaysIso(def.openedAt, 7),
      status: 'open',
      resolution: null,
    });
  }
  // Late-generated linked deliveries (if any) need keys, IDs and hashes too.
  for (const d of deliveries) {
    if (d.key === 0) {
      d.key = nextKey();
      if (d.enteredAt) {
        const { year, seq } = nextDeliverySeq(deliverySeqByYear, Date.parse(d.enteredAt));
        deliverySeqByYear[String(year)] = seq;
        d.readableId = deliveryReadableId(year, seq);
      }
      d.hash = deliveryHash(d);
    }
  }
  {
    const openedAt = eatIso('2026-09-03', 7, 55);
    disputes.unshift({
      key: nextKey(),
      uuid: resolvedDisputeUuid,
      readableId: disputeReadableId(2026, 271),
      farmerUuid: demoFarmer.uuid,
      membershipUuid: demoTegatMembership.uuid,
      centreUuid: demoTegatMembership.centreUuid,
      factoryUuid: tegat.uuid,
      deliveryUuid: null,
      reason: 'delivery_missing',
      farmerNote: 'My delivery of 41.6 kg on 14 August is missing from my August statement. I have the SMS receipt.',
      openedAt,
      deadlineAt: addDaysIso(openedAt, 7),
      status: 'resolved_upheld',
      resolution: {
        outcome: 'upheld',
        note: 'Upheld. The clerk keyed farmer number 132 instead of 123. The delivery has been moved to your number by correction and now shows on your August statement.',
        resolvedAt: correctionAt,
        byUuid: unitManager.uuid,
        byName: unitManager.name,
        reversalUuid: reversal.uuid,
        correctedDeliveryUuid: corrected.uuid,
      },
    });
  }

  /* ---------- sealed days (last 14 days at Tegat) ---------- */
  const sealedDates = dateRange(addDays(DEMO_TODAY, -14), yesterday);
  const sealedDays = buildSealedDays(
    deliveries,
    tegat.uuid,
    sealedDates,
    chainAnchorHash(tegat.readableId, addDays(sealedDates[0] ?? DEMO_TODAY, -1)),
    (date) => {
      const sealedAt = eatIso(addDays(date, 1), 0, 5);
      return { key: nextKey(), uuid: uuidAt(sealedAt), sealedAt };
    },
  );

  /* ---------- audit packs (Aug, Sep 2026) ---------- */
  const makePack = (month: string, preparedAt: IsoDateTime): AuditPack => {
    const entries = deliveries.filter(
      (d) => d.factoryUuid === tegat.uuid && isInLedger(d) && d.enteredAt !== null && monthKeyOf(d.enteredAt) === month,
    );
    return {
      key: nextKey(),
      uuid: uuidAt(preparedAt),
      factoryUuid: tegat.uuid,
      reference: `PACK-${tegat.code}-${month}`,
      month,
      preparedAt,
      preparedByName: factoryAuditor.name,
      status: 'ready',
      deliveryCount: entries.length,
      totalKg: sumKg(entries.map((e) => e.kg)),
      sealedDayCount: sealedDaysInMonth(sealedDays, tegat.uuid, month),
      checksum: auditPackChecksum(tegat.readableId, month, entries.map((e) => ({ id: e.readableId ?? e.uuid, hash: e.hash }))),
    };
  };
  const auditPacks = [makePack('2026-08', eatIso('2026-09-02', 9, 10)), makePack('2026-09', eatIso('2026-10-02', 9, 30))];

  /* ---------- access log ---------- */
  const chepkemoi = farmerNamed('Chepkemoi Rotich');
  const logDefs: ReadonlyArray<[IsoDateTime, StaffUser | null, AccessLogEntry['action'], string, Uuid | null, Uuid | null]> = [
    [eatIso('2026-09-02', 9, 10), factoryAuditor, 'export', 'Prepared and exported the August 2026 audit pack', tegat.uuid, null],
    [eatIso('2026-10-02', 9, 30), factoryAuditor, 'export', 'Prepared and exported the September 2026 audit pack', tegat.uuid, null],
    [eatIso('2026-10-14', 11, 20), factoryAuditor, 'view', "Viewed one farmer's delivery history", tegat.uuid, demoFarmer.uuid],
    [eatIso('2026-10-20', 14, 5), countyAuditor, 'view', 'Viewed Tegat factory summary', tegat.uuid, null],
    [eatIso('2026-10-21', 16, 45), factoryAuditor, 'view', "Viewed one farmer's ledger for a dispute review", tegat.uuid, chepkemoi.uuid],
    [eatIso('2026-10-22', 10, 14), countyAuditor, 'view', 'Viewed audit chain status for all factories', null, null],
    [verifiedAt, null, 'verify', 'Verified audit chains for all factories', null, null],
  ];
  const accessLog: AccessLogEntry[] = logDefs.map(([at, actor, action, description, factoryUuid, farmerUuid]) => ({
    key: nextKey(),
    uuid: uuidAt(at),
    at,
    actorName: actor ? actor.name : 'TwoLeaf system',
    actorRole: actor ? actor.role : 'system',
    action,
    description,
    factoryUuid,
    farmerUuid,
  }));

  const tg043 = centreOf('TG-043');
  return {
    county,
    factories,
    centres,
    devices,
    staff,
    farmers,
    memberships,
    pluckers,
    deliveries,
    disputes,
    sealedDays,
    auditPacks,
    accessLog,
    tampering: null,
    counters: {
      nextKey: keySeq,
      deliverySeqByYear,
      disputeSeqByYear: { '2026': 318 },
      farmerSeq: 9912,
      pluckerSeq: 12437,
    },
    demo: {
      countyUuid: county.uuid,
      factoryUuid: tegat.uuid,
      centreUuid: tg043.uuid,
      deviceId: tg043.deviceId,
      clerkUuid: tg043.clerkUuid,
      farmerUuid: demoFarmer.uuid,
      pluckerUuid: faith.uuid,
      unitManagerUuid: unitManager.uuid,
      countyOfficerUuid: countyOfficer.uuid,
      countyAuditorUuid: countyAuditor.uuid,
    },
    revision: 0,
  };
}

/** One-line summary of seed counts. */
export function seedSummary(state: AppState): string {
  const tegat = state.demo.factoryUuid;
  const tegatCentres = state.centres.filter((c) => c.factoryUuid === tegat).length;
  const tegatFarmers = new Set(state.memberships.filter((m) => m.factoryUuid === tegat).map((m) => m.farmerUuid)).size;
  const pending = state.deliveries.filter((d) => d.status === 'pending').length;
  return (
    `[TwoLeaf seed ${SEED}] factories ${state.factories.length}, centres ${state.centres.length} (Tegat ${tegatCentres}), ` +
    `farmers ${state.farmers.length} (Tegat ${tegatFarmers}), memberships ${state.memberships.length}, pluckers ${state.pluckers.length}, ` +
    `deliveries ${state.deliveries.length} (pending ${pending}), disputes ${state.disputes.length}, ` +
    `sealed days ${state.sealedDays.length}, audit packs ${state.auditPacks.length}, access log ${state.accessLog.length}`
  );
}

/** Log the summary once in development. */
export function logSeedSummary(state: AppState): void {
  if (import.meta.env.DEV) console.info(seedSummary(state));
}

