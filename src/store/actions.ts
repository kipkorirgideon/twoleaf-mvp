/**
 * Store actions: a discriminated union handled by an exhaustive switch in `reducer.ts`.
 *
 * Actions carry everything that is not derivable from state (new UUIDs, timestamps,
 * user input). The reducer derives the rest (readable IDs, hashes, links) so it stays
 * pure and deterministic. Screens should not dispatch directly; call the fake API.
 */
import type {
  AccessAction,
  DeviceId,
  DisputeOutcome,
  DisputeReason,
  IsoDateTime,
  MonthKey,
  StaffRole,
  Uuid,
} from '../types';

/** A delivery weighed at a centre. Saved as `synced` when the device is online, else `pending`. */
export interface RecordDeliveryCommand {
  uuid: Uuid;
  deviceId: DeviceId;
  membershipUuid: Uuid;
  pluckerUuid: Uuid | null;
  kg: number;
  scaleId: string;
  aiFineLeafPct: number;
  fineLeafPct: number;
  qualityAdjustReason: string | null;
  photoRef: string;
  recordedAt: IsoDateTime;
}

/**
 * Append-only correction: appends a reversal (−original kg) and a corrected entry
 * (new kg, optionally a different membership at the same factory) and marks the
 * original `corrected`.
 */
export interface CorrectionCommand {
  originalUuid: Uuid;
  kg: number;
  reason: string;
  /** Move the delivery to another membership at the same factory (e.g. wrong farmer number). */
  membershipUuid: Uuid | null;
  reversalUuid: Uuid;
  correctedUuid: Uuid;
  byUuid: Uuid;
  byName: string;
  at: IsoDateTime;
  disputeUuid: Uuid | null;
}

export interface OpenDisputeCommand {
  uuid: Uuid;
  membershipUuid: Uuid;
  deliveryUuid: Uuid | null;
  reason: DisputeReason;
  note: string;
  at: IsoDateTime;
}

export interface ResolveDisputeCommand {
  disputeUuid: Uuid;
  outcome: DisputeOutcome;
  note: string;
  at: IsoDateTime;
  byUuid: Uuid;
  byName: string;
  /** Upheld with a correction: applied atomically with the resolution. */
  correction: CorrectionCommand | null;
}

/** Registers a new farmer, or adds a membership when the national ID already exists. */
export interface RegisterFarmerCommand {
  farmerUuid: Uuid;
  membershipUuid: Uuid;
  name: string;
  phone: string;
  nationalId: string;
  centreUuid: Uuid;
  farmerNumber: string;
  at: IsoDateTime;
}

export interface PrepareAuditPackCommand {
  uuid: Uuid;
  factoryUuid: Uuid;
  month: MonthKey;
  at: IsoDateTime;
  byName: string;
}

export interface AccessLogCommand {
  uuid: Uuid;
  at: IsoDateTime;
  actorName: string;
  actorRole: StaffRole;
  action: AccessAction;
  description: string;
  factoryUuid: Uuid | null;
  farmerUuid: Uuid | null;
}

export type Action =
  | { type: 'delivery/recorded'; command: RecordDeliveryCommand }
  | { type: 'delivery/corrected'; command: CorrectionCommand }
  | { type: 'device/synced'; deviceId: DeviceId; at: IsoDateTime }
  | { type: 'device/connectivitySet'; deviceId: DeviceId; online: boolean; at: IsoDateTime }
  | { type: 'dispute/opened'; command: OpenDisputeCommand }
  | { type: 'dispute/resolved'; command: ResolveDisputeCommand }
  | { type: 'farmer/registered'; command: RegisterFarmerCommand }
  | { type: 'factory/logoSet'; factoryUuid: Uuid; dataUrl: string | null }
  | { type: 'audit/chainVerified'; factoryUuid: Uuid; at: IsoDateTime; intact: boolean; failedDate: string | null; dayCount: number }
  | { type: 'audit/tamperingSimulated'; factoryUuid: Uuid }
  | { type: 'audit/tamperingRestored' }
  | { type: 'audit/packPrepared'; command: PrepareAuditPackCommand }
  | { type: 'accessLog/appended'; command: AccessLogCommand }
  | { type: 'demo/reset' };

export type ActionType = Action['type'];
