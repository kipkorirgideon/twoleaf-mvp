/**
 * Domain entities held in the store. This file is the contract between agents:
 * only the data engineer changes it.
 *
 * Conventions
 *  - Money is integer cents (`…Cents`). Format only with `src/lib/format.ts`.
 *  - Kilos are numbers rounded to one decimal (`kg`). Reversal entries are negative.
 *  - Percentages are numbers 0–100 (fine leaf share).
 *  - Dates are EAT ISO strings (see `IsoDateTime`, `IsoDate`, `MonthKey`).
 */
import type {
  DeviceId,
  InternalKey,
  IsoDate,
  IsoDateTime,
  MonthKey,
  ReadableId,
  Uuid,
} from './ids';

/* ------------------------------------------------------------------ */
/* Literal unions                                                      */
/* ------------------------------------------------------------------ */

/** The five demo roles (role picker and demo bar). */
export type Role = 'county' | 'factory' | 'clerk' | 'farmer' | 'plucker';

/** UI language for farmer and plucker apps. */
export type Lang = 'en' | 'sw';

/**
 * Ledger entry status.
 *  - `synced`: in the factory ledger (online delivery, synced offline delivery, or a corrected entry).
 *  - `pending`: saved on a clerk device while offline, waiting to sync (no readable ID yet).
 *  - `corrected`: an original entry that has been superseded by a correction. Stays visible.
 *  - `reversal`: the negative entry that cancels a corrected original.
 */
export type DeliveryStatus = 'synced' | 'pending' | 'corrected' | 'reversal';

/** Dispute lifecycle. Shown as Open / Resolved: upheld / Resolved: rejected. */
export type DisputeStatus = 'open' | 'resolved_upheld' | 'resolved_rejected';

/** Outcome chosen by the factory when resolving a dispute. */
export type DisputeOutcome = 'upheld' | 'rejected';

/** Reasons a farmer can pick in "Report a problem" (spec section 10). */
export type DisputeReason =
  | 'weight_wrong'
  | 'quality_wrong'
  | 'delivery_missing'
  | 'wrong_farmer_number'
  | 'other';

/** Buying centre / clerk device connectivity. */
export type ConnectivityStatus = 'online' | 'offline';

/** Membership status at a buying centre. */
export type MembershipStatus = 'active' | 'suspended';

/** Staff roles (Settings > Users and roles, access log actors). */
export type StaffRole =
  | 'county_officer'
  | 'county_auditor'
  | 'unit_manager'
  | 'factory_auditor'
  | 'clerk'
  | 'system';

/**
 * How much detail the demo holds for a factory.
 *  - `full`: Tegat. Centres, farmers, deliveries and disputes are individual records.
 *  - `aggregate`: other factories. Only factory-level figures are held.
 */
export type FactoryDetailLevel = 'full' | 'aggregate';

/** Access log actions. */
export type AccessAction = 'view' | 'export' | 'verify' | 'prepare';

/** Payment status of a monthly payment or bonus. The system never pays anyone. */
export type PaymentStatus = 'paid' | 'due';

/** Farmer Home period selector. */
export type FarmerPeriod =
  | 'this_month'
  | '3_months'
  | '6_months'
  | '9_months'
  | 'this_year'
  | 'last_year';

/* ------------------------------------------------------------------ */
/* Shared value objects                                                */
/* ------------------------------------------------------------------ */

/** One month of aggregate figures. `months` arrays are oldest first; the last one is the current month to date. */
export interface MonthlyFigure {
  month: MonthKey;
  kg: number;
  deliveries: number;
  /** Centre (AI + clerk) fine leaf %, kg-weighted. */
  fineLeafPct: number;
  /** Factory intake fine leaf %, kg-weighted. */
  intakeFineLeafPct: number;
}

/** Bonus formula inputs saved by the factory (spec section 3, Money). */
export interface BonusInputs {
  formulaVersion: string;
  madeTeaSoldKg: number;
  avgAuctionPriceCentsPerKg: number;
  greenLeafReceivedKg: number;
  processingCostsCents: number;
  managementFeeAndLeviesCents: number;
  /** Rate used for "Monthly payments already made" (green leaf × this rate). */
  monthlyRateCentsPerKg: number;
}

/** A factory's bonus (second payment) declaration for one financial year. */
export interface BonusDeclaration {
  /** Financial year label, e.g. `2025/26` (1 Jul 2025 – 30 Jun 2026). */
  fy: string;
  fyStart: IsoDate;
  fyEnd: IsoDate;
  /** Formula version, e.g. `v2026.1`. Null when only the declared figure is known. */
  formulaVersion: string | null;
  /** Figure declared in September (cents per kg). For factories with inputs this was produced by `computeBonus`. */
  declaredPerKgCents: number;
  declaredOn: IsoDate;
  paidOn: IsoDate;
  /** Saved inputs. Present for Tegat and Toror; null for aggregate-only factories. */
  inputs: BonusInputs | null;
}

/** Last chain verification for a factory. */
export interface ChainStatus {
  lastVerifiedAt: IsoDateTime;
  intact: boolean;
  /** First sealed date that failed, when not intact. */
  failedDate: IsoDate | null;
  sealedDayCount: number;
}

/** Aggregate figures for one buying centre of an aggregate-only factory (no farmer data). */
export interface CentreAggregate {
  code: string;
  name: string;
  farmerCount: number;
  kgThisMonth: number;
  fineLeafPct: number;
  intakeFineLeafPct: number;
}

/** Factory-level figures for factories held in aggregate only (`detailLevel: 'aggregate'`). */
export interface FactoryAggregate {
  farmerCount: number;
  centres: CentreAggregate[];
  /** Last 6 months, oldest first, current month to date last. */
  months: MonthlyFigure[];
  kgToday: number;
  deliveriesToday: number;
  openDisputes: number;
  disputesOpenedThisFy: number;
  disputesResolvedThisFy: number;
  avgDaysToResolve: number;
  oldestOpenDisputeAt: IsoDateTime | null;
  lastSyncAt: IsoDateTime;
  offlineCentreCount: number;
  pendingSyncCount: number;
}

/**
 * Tegat only: figures for the part of the factory that is not seeded as individual
 * records (the demo lists 24 farmers; the real factory has about 1,200). Factory and
 * county figures add these to what is computed from the ledger.
 */
export interface FactoryBackground {
  disputesOpenedThisFy: number;
  disputesResolvedThisFy: number;
  /** Sum of days-to-resolve over `disputesResolvedThisFy`. */
  totalResolveDays: number;
}

/** Tegat centres only: the unlisted part of the centre (see `FactoryBackground`). */
export interface CentreBackground {
  unlistedFarmerCount: number;
  /** Last 6 months, oldest first, current month to date last. */
  months: MonthlyFigure[];
  kgToday: number;
  deliveriesToday: number;
}

/** West vs East of Rift auction price comparison shown on the county overview. */
export interface RegionalPriceComparison {
  periodLabel: string;
  westOfRiftCentsPerKg: number;
  eastOfRiftCentsPerKg: number;
  note: string;
}

/* ------------------------------------------------------------------ */
/* Entities                                                            */
/* ------------------------------------------------------------------ */

export interface County {
  key: InternalKey;
  uuid: Uuid;
  /** `TLF-KCO` */
  readableId: ReadableId;
  name: string;
  shortName: string;
  /** Official county code, `035` for Kericho. */
  officialCode: string;
  /** TwoLeaf region code, `KCO`. Fixed at registration. */
  regionCode: string;
  regionalPrices: RegionalPriceComparison;
}

export interface Factory {
  key: InternalKey;
  uuid: Uuid;
  /** e.g. `TLF-KCO-FAC-000014` */
  readableId: ReadableId;
  countyUuid: Uuid;
  /** Two-letter prefix used in centre codes, e.g. `TG`. */
  code: string;
  /** e.g. `Tegat Tea Factory` */
  name: string;
  /** e.g. `Tegat` */
  shortName: string;
  detailLevel: FactoryDetailLevel;
  avgAuctionPriceCentsPerKg: number;
  bonus: BonusDeclaration;
  /** Logo uploaded in Settings (data URL). Null falls back to initials. */
  logoDataUrl: string | null;
  /** Present when `detailLevel === 'aggregate'`. */
  aggregate: FactoryAggregate | null;
  /** Present when `detailLevel === 'full'`. */
  background: FactoryBackground | null;
  chain: ChainStatus;
  registeredOn: IsoDate;
}

export interface BuyingCentre {
  key: InternalKey;
  uuid: Uuid;
  /** e.g. `TLF-KCO-BC-000231` */
  readableId: ReadableId;
  factoryUuid: Uuid;
  /** External code, e.g. `TG-043`. */
  code: string;
  name: string;
  clerkUuid: Uuid;
  deviceId: DeviceId;
  scaleIds: string[];
  /** Unlisted part of the centre (Tegat only, null otherwise). */
  background: CentreBackground | null;
  openedOn: IsoDate;
}

/** Clerk handheld at a buying centre. Owns connectivity and offline numbering. */
export interface ClerkDevice {
  deviceId: DeviceId;
  centreUuid: Uuid;
  clerkUuid: Uuid;
  online: boolean;
  /** When the device went offline; null while online. */
  offlineSince: IsoDateTime | null;
  lastSyncAt: IsoDateTime;
  /** Last temporary number issued (`TMP-TG043-0007` uses 7). */
  tempSeq: number;
  /**
   * Deliveries waiting on the device for farmers not listed individually in the demo.
   * Added to the listed pending deliveries for the "waiting to sync" count. Cleared on sync.
   */
  unlistedPendingCount: number;
}

export interface StaffUser {
  uuid: Uuid;
  name: string;
  role: StaffRole;
  /** Display title, e.g. "Unit manager". */
  title: string;
  countyUuid: Uuid | null;
  factoryUuid: Uuid | null;
  centreUuid: Uuid | null;
  phone: string;
}

export interface Farmer {
  key: InternalKey;
  uuid: Uuid;
  /** e.g. `TLF-KCO-FMR-0004817` */
  readableId: ReadableId;
  name: string;
  /** `07XX XXX XXX` (invented). */
  phone: string;
  nationalId: string;
  joinedOn: IsoDate;
}

/**
 * A farmer's membership at one buying centre. A farmer who delivers to two centres
 * has one TwoLeaf ID and two memberships. `farmerNumber` is unique within its centre only.
 */
export interface Membership {
  key: InternalKey;
  uuid: Uuid;
  farmerUuid: Uuid;
  factoryUuid: Uuid;
  centreUuid: Uuid;
  /** e.g. `123` (Tegat) or `0456` (Toror). Shown as `TG-043 / 123`. */
  farmerNumber: string;
  joinedOn: IsoDate;
  status: MembershipStatus;
}

export interface Plucker {
  key: InternalKey;
  uuid: Uuid;
  /** e.g. `TLF-KCO-PLK-0012094` */
  readableId: ReadableId;
  name: string;
  phone: string;
  joinedOn: IsoDate;
  /** Farmers this plucker works for (1–3). */
  farmerUuids: Uuid[];
}

/** Who corrected a ledger entry and why. Present on reversal and corrected entries. */
export interface CorrectionNote {
  reason: string;
  byUuid: Uuid;
  byName: string;
  at: IsoDateTime;
  /** The dispute that triggered the correction, if any. */
  disputeUuid: Uuid | null;
}

/**
 * One ledger entry. Append-only: entries are never edited or deleted. The only
 * in-place changes are `pending` → `synced` on sync (readable ID assigned, same UUID)
 * and `synced` → `corrected` on the original when a correction is recorded.
 *
 * Sum `kg` over all non-pending entries to get net kilos; for quality and listing
 * "effective" deliveries use entries with status `synced` or `pending`.
 */
export interface Delivery {
  key: InternalKey;
  uuid: Uuid;
  /** e.g. `TLF-KCO-DLV-2026-00845123`. Null while pending. */
  readableId: ReadableId | null;
  /** Temporary device ID such as `TMP-TG043-0007` for deliveries saved offline. */
  tempId: string | null;
  farmerUuid: Uuid;
  membershipUuid: Uuid;
  centreUuid: Uuid;
  factoryUuid: Uuid;
  /** When the leaf was weighed (business date). Reversal and corrected entries copy the original's. */
  recordedAt: IsoDateTime;
  /** When the entry entered the factory ledger. Null while pending. Sealed days group by this date. */
  enteredAt: IsoDateTime | null;
  /** One decimal. Negative on reversal entries. */
  kg: number;
  /** AI estimate from the sample photo. */
  aiFineLeafPct: number;
  /** Centre score confirmed by the clerk (AI ± at most 5). */
  fineLeafPct: number;
  /** Reason given when the clerk adjusted the AI score. */
  qualityAdjustReason: string | null;
  /** Factory intake score for the lot. Null until the lot reaches the factory. */
  intakeFineLeafPct: number | null;
  pluckerUuid: Uuid | null;
  clerkUuid: Uuid;
  /** e.g. `SCL-TG043-02` */
  scaleId: string;
  deviceId: DeviceId;
  /** Reference to the leaf sample photo (placeholder illustration in the demo). */
  photoRef: string;
  status: DeliveryStatus;
  /** FNV-1a (16 hex) over the entry's content. See `deliveryHashInput`. */
  hash: string;
  /** On a reversal entry: the original it cancels. */
  reversalOf: Uuid | null;
  /** On a corrected entry: the original it replaces. */
  correctionOf: Uuid | null;
  correction: CorrectionNote | null;
}

export interface DisputeResolution {
  outcome: DisputeOutcome;
  note: string;
  resolvedAt: IsoDateTime;
  byUuid: Uuid;
  byName: string;
  /** Ledger entries created when upheld with a correction. */
  reversalUuid: Uuid | null;
  correctedDeliveryUuid: Uuid | null;
}

export interface Dispute {
  key: InternalKey;
  uuid: Uuid;
  /** e.g. `TLF-KCO-DSP-2026-000318` */
  readableId: ReadableId;
  farmerUuid: Uuid;
  membershipUuid: Uuid;
  centreUuid: Uuid;
  factoryUuid: Uuid;
  /** Linked delivery, if any (none for "delivery missing"). */
  deliveryUuid: Uuid | null;
  reason: DisputeReason;
  farmerNote: string;
  openedAt: IsoDateTime;
  /** openedAt + 7 days. */
  deadlineAt: IsoDateTime;
  status: DisputeStatus;
  resolution: DisputeResolution | null;
}

/** A sealed (closed) day in a factory's ledger. Today stays open until midnight. */
export interface SealedDay {
  key: InternalKey;
  uuid: Uuid;
  factoryUuid: Uuid;
  date: IsoDate;
  count: number;
  totalKg: number;
  /** Readable IDs of the ledger entries entered that day, in ledger order. */
  deliveryIds: ReadableId[];
  prevHash: string;
  /** `fnv1a64(prevHash | date | count | totalKg | deliveryIds)` — see `sealedDayHash`. */
  hash: string;
  sealedAt: IsoDateTime;
}

export interface AuditPack {
  key: InternalKey;
  uuid: Uuid;
  factoryUuid: Uuid;
  /** Display reference, e.g. `PACK-TG-2026-09`. */
  reference: string;
  month: MonthKey;
  preparedAt: IsoDateTime;
  preparedByName: string;
  status: 'ready';
  deliveryCount: number;
  totalKg: number;
  sealedDayCount: number;
  /** FNV-1a (16 hex) over the month's ledger. */
  checksum: string;
}

export interface AccessLogEntry {
  key: InternalKey;
  uuid: Uuid;
  at: IsoDateTime;
  actorName: string;
  actorRole: StaffRole;
  action: AccessAction;
  /** Plain-language description without farmer names, e.g. "Viewed Tegat factory summary". */
  description: string;
  factoryUuid: Uuid | null;
  /** Set when farmer-level data was viewed or exported. County selectors never expose it. */
  farmerUuid: Uuid | null;
}

/** Demo-only tampering simulation (Audit > Simulate tampering). */
export interface TamperingState {
  factoryUuid: Uuid;
  deliveryUuid: Uuid;
  date: IsoDate;
  originalKg: number;
  tamperedKg: number;
}

/** The identities the five demo roles act as. */
export interface DemoIdentities {
  countyUuid: Uuid;
  factoryUuid: Uuid;
  centreUuid: Uuid;
  deviceId: DeviceId;
  clerkUuid: Uuid;
  farmerUuid: Uuid;
  pluckerUuid: Uuid;
  unitManagerUuid: Uuid;
  countyOfficerUuid: Uuid;
  countyAuditorUuid: Uuid;
}

/** Sequence counters used to issue readable IDs. */
export interface Counters {
  nextKey: number;
  /** Last delivery sequence issued per year (`'2026' → 845123`). County-wide. */
  deliverySeqByYear: Record<string, number>;
  /** Last dispute sequence issued per year. County-wide. */
  disputeSeqByYear: Record<string, number>;
  farmerSeq: number;
  pluckerSeq: number;
}

/** Everything in the store. */
export interface AppState {
  county: County;
  factories: Factory[];
  centres: BuyingCentre[];
  devices: ClerkDevice[];
  staff: StaffUser[];
  farmers: Farmer[];
  memberships: Membership[];
  pluckers: Plucker[];
  /** The ledger, in ledger order (append-only). */
  deliveries: Delivery[];
  disputes: Dispute[];
  sealedDays: SealedDay[];
  auditPacks: AuditPack[];
  accessLog: AccessLogEntry[];
  tampering: TamperingState | null;
  counters: Counters;
  demo: DemoIdentities;
  /** Increments on every successful action; useful for refetching. */
  revision: number;
}
