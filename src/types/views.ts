/**
 * View models returned by selectors and the fake API. Screens render these.
 *
 * Tenancy is encoded in the shapes:
 *  - `County…` and `FactoryOverview` views carry aggregates only. No farmer names,
 *    farmer IDs, phone numbers or individual deliveries.
 *  - `Factory…` views are scoped to one factory; memberships at other factories never appear.
 *  - `Farmer…` views combine all of one farmer's memberships.
 *  - `Plucker…` views cover one plucker's own sessions.
 */
import type {
  AccessAction,
  AuditPack,
  BonusDeclaration,
  BonusInputs,
  ChainStatus,
  ConnectivityStatus,
  CorrectionNote,
  County,
  DeliveryStatus,
  DisputeOutcome,
  DisputeReason,
  DisputeStatus,
  Factory,
  FarmerPeriod,
  MembershipStatus,
  MonthlyFigure,
  PaymentStatus,
  RegionalPriceComparison,
  Role,
  SealedDay,
  StaffRole,
  StaffUser,
} from './domain';
import type { DeviceId, IsoDate, IsoDateTime, MonthKey, ReadableId, Uuid } from './ids';

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

/** Who the current demo role is acting as (GET /api/v1/auth/session). */
export interface Session {
  role: Role;
  personName: string;
  personTitle: string;
  countyUuid: Uuid;
  factoryUuid: Uuid | null;
  centreUuid: Uuid | null;
  deviceId: DeviceId | null;
  farmerUuid: Uuid | null;
  pluckerUuid: Uuid | null;
  staffUuid: Uuid | null;
}

/** Light reference to a factory. */
export interface FactoryRef {
  uuid: Uuid;
  readableId: ReadableId;
  code: string;
  name: string;
  shortName: string;
}

/** Light reference to a buying centre. */
export interface CentreRef {
  uuid: Uuid;
  readableId: ReadableId;
  code: string;
  name: string;
  factoryUuid: Uuid;
}

/** Light reference to a farmer, always paired with the membership in context. */
export interface FarmerRef {
  uuid: Uuid;
  readableId: ReadableId;
  name: string;
  membershipUuid: Uuid;
  farmerNumber: string;
  /** `TG-043 / 123` */
  farmerRef: string;
}

export interface PluckerRef {
  uuid: Uuid;
  readableId: ReadableId;
  name: string;
}

/** Centre score vs factory intake score. */
export interface QualityGap {
  centreFineLeafPct: number;
  intakeFineLeafPct: number;
  /** centre − intake, in points. Positive means leaf damaged in transport. */
  gapPts: number;
}

/** "↑ 4.2%" style change. Always paired with a word or arrow on screen. */
export interface Change {
  direction: 'up' | 'down' | 'flat';
  pct: number;
}

/* ------------------------------------------------------------------ */
/* Deliveries                                                          */
/* ------------------------------------------------------------------ */

/** One row in a delivery table (factory, clerk). */
export interface DeliveryRow {
  uuid: Uuid;
  /** Readable ID, or the temporary device ID while pending. Use this on screen. */
  displayId: string;
  readableId: ReadableId | null;
  tempId: string | null;
  recordedAt: IsoDateTime;
  enteredAt: IsoDateTime | null;
  farmer: FarmerRef;
  centre: CentreRef;
  kg: number;
  fineLeafPct: number;
  intakeFineLeafPct: number | null;
  plucker: PluckerRef | null;
  status: DeliveryStatus;
  reversalOf: Uuid | null;
  correctionOf: Uuid | null;
}

/** Full delivery for the drawer / detail screens. */
export interface DeliveryDetail extends DeliveryRow {
  aiFineLeafPct: number;
  qualityAdjustReason: string | null;
  clerkName: string;
  scaleId: string;
  deviceId: DeviceId;
  photoRef: string;
  hash: string;
  /** False when the stored hash no longer matches the entry (tampering). */
  hashValid: boolean;
  correction: CorrectionNote | null;
  /** The original (for reversal / corrected entries). */
  original: DeliveryRow | null;
  /** Reversal entries that cancel this one. */
  reversals: DeliveryRow[];
  /** Corrected entries that replace this one. */
  corrections: DeliveryRow[];
  /** Disputes linked to this delivery (same factory only). */
  disputeUuids: Uuid[];
}

export interface DeliveryFilters {
  centreUuid?: Uuid;
  status?: DeliveryStatus;
  /** Farmer name, readable ID (full or short), delivery ID, or `TG-043 / 123`. */
  search?: string;
  /** Inclusive EAT date bounds on `recordedAt`. */
  from?: IsoDate;
  to?: IsoDate;
  farmerUuid?: Uuid;
  pluckerUuid?: Uuid;
  limit?: number;
}

/* ------------------------------------------------------------------ */
/* Centres                                                             */
/* ------------------------------------------------------------------ */

export interface CentreConnectivity {
  status: ConnectivityStatus;
  /** Whole hours offline (0 when online). */
  offlineHours: number;
  offlineSince: IsoDateTime | null;
  /** Total waiting to sync: `listedPendingCount + unlistedPendingCount`. */
  pendingCount: number;
  /** Pending deliveries listed individually in the demo (visible in delivery tables). */
  listedPendingCount: number;
  /** Pending deliveries on the device from farmers not listed in the demo (not in any table). */
  unlistedPendingCount: number;
  lastSyncAt: IsoDateTime;
  deviceId: DeviceId;
}

export interface CentreSummary extends CentreRef {
  clerkName: string;
  clerkUuid: Uuid;
  /** Listed + unlisted farmers. */
  farmerCount: number;
  listedFarmerCount: number;
  kgToday: number;
  deliveriesToday: number;
  kgThisMonth: number;
  quality: QualityGap;
  connectivity: CentreConnectivity;
}

export interface CentreDetail extends CentreSummary {
  deliveries: DeliveryRow[];
  farmers: FactoryFarmerRow[];
  /** Last 6 months, oldest first. */
  months: MonthlyFigure[];
}

/* ------------------------------------------------------------------ */
/* Factory app                                                         */
/* ------------------------------------------------------------------ */

/**
 * Factory-level figures used by the county (all six factories) and the factory dashboard.
 * Aggregates only.
 */
export interface FactoryOverview extends FactoryRef {
  detailLevel: Factory['detailLevel'];
  logoDataUrl: string | null;
  farmerCount: number;
  centreCount: number;
  kgToday: number;
  kgThisMonth: number;
  /** Same period last month (1st to today's day-of-month). */
  kgLastMonthToDate: number;
  changeVsLastMonth: Change;
  fineLeafPct: number;
  intakeFineLeafPct: number;
  avgAuctionPriceCentsPerKg: number;
  bonusPerKgCents: number;
  openDisputes: number;
  /** openDisputes ÷ farmers × 100. Needs attention above 0.5. */
  disputeRatePct: number;
  lastSyncAt: IsoDateTime;
  offlineCentreCount: number;
  pendingSyncCount: number;
  /** Last 6 months, oldest first. */
  trend: MonthlyFigure[];
  chain: ChainStatus;
}

export interface FactoryAlert {
  kind: 'centre_offline';
  centreUuid: Uuid;
  centreCode: string;
  centreName: string;
  offlineHours: number;
  pendingCount: number;
  /** "TG-051 Kiptere has been offline for 3 hours. 14 deliveries are waiting to sync." */
  message: string;
}

export interface FactoryDashboard {
  factory: FactoryOverview;
  /** Farmers with a delivery in the last 30 days (listed + unlisted). */
  activeFarmers: number;
  alerts: FactoryAlert[];
  centres: CentreSummary[];
  recentDeliveries: DeliveryRow[];
  /** Pending deliveries per centre code. */
  pendingByCentre: Record<string, number>;
}

export interface FactoryFarmerRow {
  farmer: FarmerRef;
  centre: CentreRef;
  phone: string;
  kgThisMonth: number;
  /** Null when no deliveries this month. */
  fineLeafPct: number | null;
  membershipStatus: MembershipStatus;
  /** Delivered in the last 30 days. */
  active: boolean;
  lastDeliveryAt: IsoDateTime | null;
}

export interface MonthlyPayment {
  month: MonthKey;
  membershipUuid: Uuid;
  factoryUuid: Uuid;
  centreCode: string;
  kg: number;
  rateCentsPerKg: number;
  amountCents: number;
  status: PaymentStatus;
  /** Last day of the month. */
  payDate: IsoDate;
}

/** Factory-scoped farmer detail. Contains only this factory's membership(s). */
export interface FactoryFarmerDetail {
  farmer: {
    uuid: Uuid;
    readableId: ReadableId;
    name: string;
    phone: string;
    nationalId: string;
    joinedOn: IsoDate;
  };
  memberships: Array<{ membershipUuid: Uuid; centre: CentreRef; farmerNumber: string; farmerRef: string; joinedOn: IsoDate; status: MembershipStatus }>;
  /** Last 6 months, oldest first. */
  trend: MonthlyFigure[];
  deliveries: DeliveryRow[];
  payments: MonthlyPayment[];
  bonus: FarmerBonus | null;
  disputes: DisputeRow[];
  pluckers: PluckerRef[];
}

export interface PluckerSession {
  deliveryUuid: Uuid;
  displayId: string;
  recordedAt: IsoDateTime;
  farmerName: string;
  farmerUuid: Uuid;
  centre: CentreRef;
  factoryShortName: string;
  kg: number;
  fineLeafPct: number;
  status: DeliveryStatus;
}

/** Factory-scoped plucker row: only sessions and farmers at this factory. */
export interface FactoryPluckerRow extends PluckerRef {
  phone: string;
  farmers: FarmerRef[];
  sessionsThisMonth: number;
  kgThisMonth: number;
  avgFineLeafPct: number | null;
}

export interface FactoryPluckerDetail extends FactoryPluckerRow {
  sessions: PluckerSession[];
}

export interface FarmerQualityRow {
  farmer: FarmerRef;
  centreCode: string;
  kg: number;
  fineLeafPct: number;
}

export interface QualityReport {
  target: number;
  factoryFineLeafPct: number;
  factoryIntakeFineLeafPct: number;
  centres: Array<CentreRef & QualityGap & { kgThisMonth: number }>;
  /** Listed farmers with deliveries this month, best first. */
  topFarmers: FarmerQualityRow[];
  /** Worst first. */
  bottomFarmers: FarmerQualityRow[];
  tips: string[];
}

export interface BonusLine {
  key:
    | 'made_tea_sold'
    | 'avg_auction_price'
    | 'auction_income'
    | 'green_leaf_received'
    | 'processing_costs'
    | 'management_fee_levies'
    | 'monthly_payments'
    | 'left_for_second_payment'
    | 'bonus_per_kg';
  label: string;
  /** How it was computed, e.g. "3,962,000 kg × KSh 249.00". */
  formula: string | null;
  kind: 'kg' | 'money' | 'money_per_kg';
  /** kg for `kind: 'kg'`, cents otherwise. */
  value: number;
  /** True for lines derived from the others. */
  computed: boolean;
}

export interface BonusComputation {
  formulaVersion: string;
  auctionIncomeCents: number;
  monthlyPaymentsCents: number;
  leftForSecondPaymentCents: number;
  /** Unrounded cents per kg. */
  bonusPerKgCentsExact: number;
  /** Rounded to whole cents. */
  bonusPerKgCents: number;
  lines: BonusLine[];
}

export interface BonusReport {
  factory: FactoryRef;
  declaration: BonusDeclaration;
  inputs: BonusInputs | null;
  computation: BonusComputation | null;
}

export interface BonusRecalculation {
  computedPerKgCents: number;
  declaredPerKgCents: number;
  differenceCents: number;
  matches: boolean;
  /** "Recomputed from saved inputs: KSh 17.10 per kg. Matches the declared figure." */
  message: string;
  computation: BonusComputation;
}

export interface FarmerBonus {
  factory: FactoryRef;
  fy: string;
  kg: number;
  ratePerKgCents: number;
  amountCents: number;
  status: PaymentStatus;
  paidOn: IsoDate;
  avgAuctionPriceCentsPerKg: number;
  computation: BonusComputation | null;
}

export interface DisputeRow {
  uuid: Uuid;
  readableId: ReadableId;
  farmer: FarmerRef;
  centre: CentreRef;
  reason: DisputeReason;
  openedAt: IsoDateTime;
  deadlineAt: IsoDateTime;
  /** Whole days left to the deadline (negative when overdue). */
  daysToDeadline: number;
  /** Open and within 2 days of the deadline. */
  deadlineSoon: boolean;
  status: DisputeStatus;
  resolution: { outcome: DisputeOutcome; note: string; resolvedAt: IsoDateTime; byName: string } | null;
}

export interface DisputeDetail extends DisputeRow {
  farmerNote: string;
  delivery: DeliveryDetail | null;
  correctedDelivery: DeliveryRow | null;
  reversal: DeliveryRow | null;
}

export interface DayVerification {
  date: IsoDate;
  sealedHash: string;
  recomputedHash: string;
  expected: { count: number; totalKg: number };
  found: { count: number; totalKg: number };
  ok: boolean;
  /** Ledger entries of that day whose own hash no longer matches. */
  tamperedDeliveryIds: string[];
}

export interface ChainVerification {
  factoryUuid: Uuid;
  verifiedAt: IsoDateTime;
  ok: boolean;
  days: DayVerification[];
  firstFailure: DayVerification | null;
  /** "All 14 days intact" or "Day 16 Oct 2026 does not match its seal". */
  message: string;
}

export interface SealedDayRow extends SealedDay {
  /** Open day (today) is not sealed and not listed. */
  intact: boolean | null;
}

export interface AuditOverview {
  factory: FactoryRef;
  chain: ChainStatus;
  sealedDays: SealedDay[];
  packs: AuditPack[];
  accessLog: AccessLogView[];
  tamperingActive: boolean;
  /** Date of the open (unsealed) day. */
  openDay: IsoDate;
  /** Shown near the sealed days table: what the seals cover in this demo. */
  scopeNote: string;
}

/** Access log as shown to factory users (may reference a farmer by readable ID). */
export interface AccessLogView {
  uuid: Uuid;
  at: IsoDateTime;
  actorName: string;
  actorRole: StaffRole;
  action: AccessAction;
  description: string;
  factoryName: string | null;
  /** Only in factory scope; always null in county scope. */
  farmerReadableId: ReadableId | null;
}

export interface FactoryProfile {
  factory: FactoryRef & { logoDataUrl: string | null; registeredOn: IsoDate };
  county: { name: string; readableId: ReadableId; officialCode: string };
  centreCount: number;
  staff: StaffUser[];
}

/* ------------------------------------------------------------------ */
/* County app (aggregates only)                                        */
/* ------------------------------------------------------------------ */

export interface AttentionItem {
  kind: 'below_target' | 'centre_offline' | 'dispute_rate';
  factoryUuid: Uuid;
  factoryName: string;
  message: string;
  severity: 'warning' | 'danger';
}

export interface CountyOverview {
  county: Pick<County, 'uuid' | 'readableId' | 'name' | 'officialCode'>;
  factoryCount: number;
  farmerCount: number;
  kgThisMonth: number;
  kgToday: number;
  avgFineLeafPct: number;
  target: number;
  openDisputes: number;
  factories: FactoryOverview[];
  needsAttention: AttentionItem[];
  prices: RegionalPriceComparison;
}

/** County view of one factory. Aggregates only, no farmer data. */
export interface CountyFactorySummary {
  factory: FactoryOverview;
  centres: Array<{ code: string; name: string; farmerCount: number; kgThisMonth: number } & QualityGap>;
  privacyNote: string;
}

export interface CountyQualityRow {
  factory: FactoryRef;
  months: Array<{ month: MonthKey; fineLeafPct: number; intakeFineLeafPct: number }>;
  current: QualityGap;
}

export interface CountyDisputeRow {
  factory: FactoryRef;
  openDisputes: number;
  openedThisFy: number;
  resolvedThisFy: number;
  disputeRatePct: number;
  avgDaysToResolve: number;
  oldestOpenAt: IsoDateTime | null;
  oldestOpenDays: number | null;
}

export interface CountyAuditRow {
  factory: FactoryRef;
  chain: ChainStatus;
  packs: AuditPack[];
}

export interface CountyAudit {
  factories: CountyAuditRow[];
  packs: Array<AuditPack & { factoryName: string }>;
  accessLog: AccessLogView[];
}

/* ------------------------------------------------------------------ */
/* Clerk app                                                           */
/* ------------------------------------------------------------------ */

export interface ClerkHome {
  centre: CentreRef;
  factory: FactoryRef;
  clerkName: string;
  deviceId: DeviceId;
  online: boolean;
  offlineSince: IsoDateTime | null;
  lastSyncAt: IsoDateTime;
  today: { deliveries: number; kg: number; avgFineLeafPct: number | null };
  pendingCount: number;
  scaleIds: string[];
}

export interface FarmerLookupResult {
  farmer: FarmerRef;
  centre: CentreRef;
  phone: string;
  /** Pluckers linked to this farmer. */
  pluckers: PluckerRef[];
}

export interface SyncResult {
  syncedCount: number;
  deliveries: DeliveryRow[];
  /** "3 deliveries synced" */
  message: string;
}

/* ------------------------------------------------------------------ */
/* Farmer app (combined across memberships)                            */
/* ------------------------------------------------------------------ */

export interface FarmerCentreCard {
  membershipUuid: Uuid;
  factory: FactoryRef;
  centre: CentreRef;
  farmerNumber: string;
  farmerRef: string;
  kg: number;
  fineLeafPct: number | null;
  /** This month's payment for this membership. */
  thisMonth: { kg: number; amountCents: number; status: PaymentStatus; payDate: IsoDate };
}

export interface FarmerHome {
  farmer: { uuid: Uuid; readableId: ReadableId; name: string };
  period: FarmerPeriod;
  periodFrom: IsoDate;
  periodTo: IsoDate;
  totals: { kg: number; fineLeafPct: number | null; paidCents: number; dueCents: number; deliveries: number };
  centres: FarmerCentreCard[];
  /** Last 6 months, all memberships combined, oldest first. */
  trend: Array<{ month: MonthKey; kg: number }>;
  belowTarget: boolean;
  target: number;
}

export interface FarmerDeliveryRow {
  uuid: Uuid;
  displayId: string;
  recordedAt: IsoDateTime;
  centre: CentreRef;
  factoryShortName: string;
  farmerRef: string;
  kg: number;
  fineLeafPct: number;
  intakeFineLeafPct: number | null;
  plucker: PluckerRef | null;
  status: DeliveryStatus;
  reversalOf: Uuid | null;
  correctionOf: Uuid | null;
}

export interface FarmerDeliveryDetail extends FarmerDeliveryRow {
  aiFineLeafPct: number;
  photoRef: string;
  clerkName: string;
  scaleId: string;
  correction: CorrectionNote | null;
  /** Open dispute already raised on this delivery, if any. */
  openDisputeUuid: Uuid | null;
  related: FarmerDeliveryRow[];
}

export interface FarmerPayments {
  months: Array<{ month: MonthKey; payments: MonthlyPayment[]; totalCents: number }>;
  bonuses: FarmerBonus[];
}

export interface FarmerDisputeRow {
  uuid: Uuid;
  readableId: ReadableId;
  factoryShortName: string;
  farmerRef: string;
  reason: DisputeReason;
  farmerNote: string;
  openedAt: IsoDateTime;
  deadlineAt: IsoDateTime;
  status: DisputeStatus;
  deliveryDisplayId: string | null;
  response: { outcome: DisputeOutcome; note: string; resolvedAt: IsoDateTime } | null;
  /** Corrected ledger entry created when the dispute was upheld with a correction (open it with getFarmerDelivery). */
  correctedDeliveryUuid: Uuid | null;
  correctedDeliveryDisplayId: string | null;
}

export interface FarmerProfile {
  uuid: Uuid;
  readableId: ReadableId;
  name: string;
  phone: string;
  joinedOn: IsoDate;
  memberships: Array<{ membershipUuid: Uuid; factory: FactoryRef; centre: CentreRef; farmerNumber: string; farmerRef: string; joinedOn: IsoDate }>;
  pluckers: PluckerRef[];
  /** FNV-1a of the readable ID; seed for the demo QR pattern. */
  qrSeed: string;
}

/* ------------------------------------------------------------------ */
/* Plucker app                                                         */
/* ------------------------------------------------------------------ */

export interface PluckerHome {
  plucker: PluckerRef;
  kgThisWeek: number;
  kgThisMonth: number;
  sessionsThisMonth: number;
  avgFineLeafPct: number | null;
  farmerCount: number;
  target: number;
}

export interface PluckerProfile extends PluckerRef {
  phone: string;
  joinedOn: IsoDate;
  farmers: Array<{ uuid: Uuid; name: string; readableId: ReadableId }>;
  /** Average fine leaf over the last 30 days. */
  avgFineLeafPct: number | null;
  qrSeed: string;
}

