/**
 * Request and response types for the fake API. Shaped so they can later match the
 * Django REST serializers one to one. Responses reuse the view models in `src/types`.
 */
import type {
  County,
  DeliveryDetail,
  DeliveryFilters,
  DeliveryRow,
  DeliveryStatus,
  DeviceId,
  DisputeOutcome,
  DisputeReason,
  DisputeStatus,
  StaffRole,
  AccessAction,
  Uuid,
} from '../types';

/** GET /api/v1/counties/{uuid} response. */
export type CountyIdentity = Pick<County, 'uuid' | 'readableId' | 'name' | 'officialCode'>;

export type ApiErrorCode = 'not_found' | 'validation' | 'conflict' | 'offline' | 'forbidden';

/** Thrown by every API function on failure. `field` names the form field at fault, if any. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly field: string | null;
  constructor(code: ApiErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.field = field ?? null;
  }
}

/* ---------- deliveries ---------- */

/** GET /api/v1/factories/{factoryUuid}/deliveries?centre=&status=&search=&from=&to= */
export interface ListDeliveriesRequest extends DeliveryFilters {
  factoryUuid: Uuid;
  status?: DeliveryStatus;
}

/** POST /api/v1/devices/{deviceId}/deliveries */
export interface CreateDeliveryRequest {
  deviceId: DeviceId;
  membershipUuid: Uuid;
  pluckerUuid: Uuid | null;
  /** From `readScale`; manual entry is not allowed. One decimal. */
  kg: number;
  scaleId: string;
  /** From `scoreLeafSample`. */
  aiFineLeafPct: number;
  /** Clerk-confirmed score, at most ±5 from the AI estimate. */
  fineLeafPct: number;
  qualityAdjustReason?: string | null;
  photoRef: string;
}

export interface CreateDeliveryResponse {
  delivery: DeliveryDetail;
  /** False when saved offline as pending (temporary ID). */
  synced: boolean;
  /** Masked phone the receipt SMS was (simulated) sent to, e.g. `07XX XXX 123`. */
  smsTo: string;
}

/** POST /api/v1/deliveries/{uuid}/corrections */
export interface CorrectDeliveryRequest {
  kg: number;
  reason: string;
  /** Move the delivery to another membership at the same factory (wrong farmer number). */
  membershipUuid?: Uuid | null;
  /** Staff member making the correction. Defaults to the demo unit manager. */
  actorUuid?: Uuid;
}

export interface CorrectDeliveryResponse {
  original: DeliveryRow;
  reversal: DeliveryRow;
  corrected: DeliveryRow;
}

/** GET /api/v1/centres/{centreUuid}/farmers/lookup?q= */
export interface LookupFarmerRequest {
  centreUuid: Uuid;
  /** Farmer number (`123`), `TG-043 / 123`, TwoLeaf ID or short ID (`FMR-0004817`). */
  query: string;
}

export interface ScaleReading {
  scaleId: string;
  kg: number;
  readAt: string;
}

export interface LeafSampleScore {
  photoRef: string;
  aiFineLeafPct: number;
  modelVersion: string;
}

/* ---------- farmers ---------- */

/** GET /api/v1/factories/{factoryUuid}/farmers?centre=&search= */
export interface ListFarmersRequest {
  factoryUuid: Uuid;
  centreUuid?: Uuid;
  search?: string;
}

/** POST /api/v1/factories/{factoryUuid}/farmers */
export interface RegisterFarmerRequest {
  factoryUuid: Uuid;
  name: string;
  phone: string;
  nationalId: string;
  centreUuid: Uuid;
  /** Suggested by `suggestFarmerNumber`; editable; unique within the centre. */
  farmerNumber: string;
}

export interface RegisterFarmerResponse {
  farmerUuid: Uuid;
  membershipUuid: Uuid;
  readableId: string;
  /** `TG-043 / 482` */
  farmerRef: string;
  name: string;
  /** True when the national ID matched an existing TwoLeaf farmer and only a membership was added. */
  existingFarmer: boolean;
}

/* ---------- disputes ---------- */

/** GET /api/v1/factories/{factoryUuid}/disputes?status= */
export interface ListDisputesRequest {
  factoryUuid: Uuid;
  status?: DisputeStatus;
}

/** POST /api/v1/farmers/{farmerUuid}/disputes */
export interface OpenDisputeRequest {
  farmerUuid: Uuid;
  membershipUuid: Uuid;
  deliveryUuid: Uuid | null;
  reason: DisputeReason;
  note: string;
}

/** POST /api/v1/disputes/{uuid}/resolution */
export interface ResolveDisputeRequest {
  outcome: DisputeOutcome;
  /** Required when rejecting. */
  note: string;
  /** Uphold with a correction to the linked (or another) delivery at the same factory. */
  correction?: { deliveryUuid: Uuid; kg: number; reason: string; membershipUuid?: Uuid | null } | null;
  actorUuid?: Uuid;
}

/* ---------- audit ---------- */

export type AuditActor = 'factory' | 'county';

/** POST /api/v1/access-log */
export interface LogAccessRequest {
  actorName: string;
  actorRole: StaffRole;
  action: AccessAction;
  description: string;
  factoryUuid: Uuid | null;
  farmerUuid: Uuid | null;
}
