/**
 * The fake REST API. Every function is async, waits 250–500 ms so loading states are
 * real, then reads or writes the in-memory store. Each is commented with the endpoint
 * it stands for. Arguments use UUIDs only (plus device IDs and month keys).
 *
 * Get an instance from React with `useApi()` (see `src/api/hooks.ts`); it is bound to
 * the store created by `<StoreProvider>`.
 */
import type {
  AccessLogView,
  AppState,
  AuditOverview,
  AuditPack,
  BonusRecalculation,
  BonusReport,
  CentreDetail,
  CentreSummary,
  ChainVerification,
  ClerkHome,
  CountyAudit,
  CountyDisputeRow,
  CountyFactorySummary,
  CountyOverview,
  CountyQualityRow,
  DeliveryDetail,
  DeliveryRow,
  DeviceId,
  DisputeDetail,
  DisputeRow,
  FactoryDashboard,
  FactoryFarmerDetail,
  FactoryFarmerRow,
  FactoryOverview,
  FactoryPluckerDetail,
  FactoryPluckerRow,
  FactoryProfile,
  FarmerBonus,
  FarmerDeliveryDetail,
  FarmerDeliveryRow,
  FarmerDisputeRow,
  FarmerHome,
  FarmerLookupResult,
  FarmerPayments,
  FarmerPeriod,
  FarmerProfile,
  MonthKey,
  PluckerHome,
  PluckerProfile,
  PluckerRef,
  PluckerSession,
  QualityReport,
  Role,
  SealedDay,
  Session,
  StaffUser,
  SyncResult,
  Uuid,
} from '../types';
import { maskPhone } from '../lib/format';
import { formatFarmerRef, generateUuidV7 } from '../lib/ids';
import { DEMO_TODAY, demoNow, demoNowMs, monthKeyOf } from '../lib/time';
import type { Action, CorrectionCommand } from '../store/actions';
import {
  nextFarmerNumber,
  validateCorrection,
  validateOpenDispute,
  validateRecordDelivery,
  validateRegisterFarmer,
  validateResolveDispute,
  type RuleError,
} from '../store/rules';
import * as sel from '../store/selectors';
import {
  ApiError,
  type AuditActor,
  type CorrectDeliveryRequest,
  type CountyIdentity,
  type CorrectDeliveryResponse,
  type CreateDeliveryRequest,
  type CreateDeliveryResponse,
  type LeafSampleScore,
  type ListDeliveriesRequest,
  type ListDisputesRequest,
  type ListFarmersRequest,
  type LogAccessRequest,
  type LookupFarmerRequest,
  type OpenDisputeRequest,
  type RegisterFarmerRequest,
  type RegisterFarmerResponse,
  type ResolveDisputeRequest,
  type ScaleReading,
} from './types';

/** What the API needs from the store. `dispatch` returns the state after the action. */
export interface StoreHandle {
  getState(): AppState;
  dispatch(action: Action): AppState;
}

/** 250–500 ms, or a custom range for slow device operations. */
function wait(minMs = 250, maxMs = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)));
}

function fail(e: RuleError): never {
  throw new ApiError(e.code, e.message, e.field);
}

function found<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new ApiError('not_found', `${what} not found.`);
  return value;
}

const newUuid = (): Uuid => generateUuidV7(demoNowMs());

export function createApi(store: StoreHandle) {
  const state = (): AppState => store.getState();

  const staffOrDefault = (uuid: Uuid | undefined, fallback: Uuid): StaffUser => {
    const s = state();
    return found(s.staff.find((x) => x.uuid === (uuid ?? fallback)), 'Staff member');
  };

  const buildCorrection = (
    deliveryUuid: Uuid,
    req: { kg: number; reason: string; membershipUuid?: Uuid | null },
    actor: StaffUser,
    disputeUuid: Uuid | null,
  ): CorrectionCommand => ({
    originalUuid: deliveryUuid,
    kg: req.kg,
    reason: req.reason,
    membershipUuid: req.membershipUuid ?? null,
    reversalUuid: newUuid(),
    correctedUuid: newUuid(),
    byUuid: actor.uuid,
    byName: actor.name,
    at: demoNow(),
    disputeUuid,
  });

  const log = (entry: LogAccessRequest): void => {
    store.dispatch({ type: 'accessLog/appended', command: { uuid: newUuid(), at: demoNow(), ...entry } });
  };

  return {
    /* ================================================================ */
    /* Session                                                          */
    /* ================================================================ */

    /** GET /api/v1/auth/session — who the current demo role acts as. */
    async getSession(role: Role): Promise<Session> {
      await wait();
      const s = state();
      const d = s.demo;
      const staff = (uuid: Uuid): StaffUser | undefined => s.staff.find((x) => x.uuid === uuid);
      const base = { role, countyUuid: d.countyUuid, factoryUuid: null, centreUuid: null, deviceId: null, farmerUuid: null, pluckerUuid: null, staffUuid: null };
      switch (role) {
        case 'county': {
          const p = staff(d.countyOfficerUuid);
          return { ...base, personName: p?.name ?? 'County officer', personTitle: p?.title ?? 'County officer', staffUuid: d.countyOfficerUuid };
        }
        case 'factory': {
          const p = staff(d.unitManagerUuid);
          return { ...base, personName: p?.name ?? 'Unit manager', personTitle: p?.title ?? 'Unit manager', factoryUuid: d.factoryUuid, staffUuid: d.unitManagerUuid };
        }
        case 'clerk': {
          const p = staff(d.clerkUuid);
          return {
            ...base,
            personName: p?.name ?? 'Clerk',
            personTitle: p?.title ?? 'Clerk',
            factoryUuid: d.factoryUuid,
            centreUuid: d.centreUuid,
            deviceId: d.deviceId,
            staffUuid: d.clerkUuid,
          };
        }
        case 'farmer': {
          const f = s.farmers.find((x) => x.uuid === d.farmerUuid);
          return { ...base, personName: f?.name ?? 'Farmer', personTitle: 'Farmer', farmerUuid: d.farmerUuid };
        }
        case 'plucker': {
          const p = s.pluckers.find((x) => x.uuid === d.pluckerUuid);
          return { ...base, personName: p?.name ?? 'Plucker', personTitle: 'Plucker', pluckerUuid: d.pluckerUuid };
        }
        default: {
          const never: never = role;
          throw new ApiError('validation', `Unknown role ${String(never)}`);
        }
      }
    },

    /* ================================================================ */
    /* County (aggregates only)                                         */
    /* ================================================================ */

    // GET /api/v1/counties/{uuid}
    /** GET /api/v1/counties/{uuid} — county identity for the sidebar. */
    async getCounty(countyUuid: Uuid): Promise<CountyIdentity> {
      await wait();
      const c = state().county;
      if (c.uuid !== countyUuid) throw new ApiError('not_found', 'County not found.');
      return { uuid: c.uuid, readableId: c.readableId, name: c.name, officialCode: c.officialCode };
    },

    /** GET /api/v1/counties/{uuid}/overview */
    async getCountyOverview(countyUuid: Uuid): Promise<CountyOverview> {
      await wait();
      if (state().county.uuid !== countyUuid) throw new ApiError('not_found', 'County not found.');
      return sel.selectCountyOverview(state(), demoNow());
    },

    /** GET /api/v1/counties/{uuid}/factories */
    async listFactories(countyUuid: Uuid): Promise<FactoryOverview[]> {
      await wait();
      return state().factories.filter((f) => f.countyUuid === countyUuid).map((f) => sel.selectFactoryOverview(state(), f.uuid, demoNow()));
    },

    /** GET /api/v1/counties/{countyUuid}/factories/{factoryUuid}/summary — aggregates only, no farmer data. */
    async getFactorySummary(factoryUuid: Uuid): Promise<CountyFactorySummary> {
      await wait();
      found(state().factories.find((f) => f.uuid === factoryUuid), 'Factory');
      return sel.selectCountyFactorySummary(state(), factoryUuid, demoNow());
    },

    /** GET /api/v1/counties/{uuid}/quality */
    async getCountyQuality(countyUuid: Uuid): Promise<CountyQualityRow[]> {
      await wait();
      if (state().county.uuid !== countyUuid) throw new ApiError('not_found', 'County not found.');
      return sel.selectCountyQuality(state(), demoNow());
    },

    /** GET /api/v1/counties/{uuid}/disputes/summary */
    async getCountyDisputes(countyUuid: Uuid): Promise<CountyDisputeRow[]> {
      await wait();
      if (state().county.uuid !== countyUuid) throw new ApiError('not_found', 'County not found.');
      return sel.selectCountyDisputes(state(), demoNow());
    },

    /** GET /api/v1/counties/{uuid}/audit */
    async getCountyAudit(countyUuid: Uuid): Promise<CountyAudit> {
      await wait();
      if (state().county.uuid !== countyUuid) throw new ApiError('not_found', 'County not found.');
      return sel.selectCountyAudit(state());
    },

    /* ================================================================ */
    /* Factory                                                          */
    /* ================================================================ */

    /** GET /api/v1/factories/{uuid} */
    async getFactory(factoryUuid: Uuid): Promise<FactoryOverview> {
      await wait();
      found(state().factories.find((f) => f.uuid === factoryUuid), 'Factory');
      return sel.selectFactoryOverview(state(), factoryUuid, demoNow());
    },

    /** GET /api/v1/factories/{uuid}/dashboard */
    async getFactoryDashboard(factoryUuid: Uuid): Promise<FactoryDashboard> {
      await wait();
      found(state().factories.find((f) => f.uuid === factoryUuid), 'Factory');
      return sel.selectFactoryDashboard(state(), factoryUuid, demoNow());
    },

    /** GET /api/v1/factories/{uuid}/profile — Settings (profile, users and roles). */
    async getFactoryProfile(factoryUuid: Uuid): Promise<FactoryProfile> {
      await wait();
      found(state().factories.find((f) => f.uuid === factoryUuid), 'Factory');
      return sel.selectFactoryProfile(state(), factoryUuid);
    },

    /** PUT /api/v1/factories/{uuid}/logo — data URL (PNG, JPG or SVG under 1 MB), or null to remove. */
    async setFactoryLogo(factoryUuid: Uuid, dataUrl: string | null): Promise<FactoryProfile> {
      await wait();
      found(state().factories.find((f) => f.uuid === factoryUuid), 'Factory');
      if (dataUrl !== null) {
        if (!/^data:image\/(png|jpeg|svg\+xml);/.test(dataUrl)) throw new ApiError('validation', 'Use a PNG, JPG or SVG image.', 'logo');
        const comma = dataUrl.indexOf(',');
        const payload = comma >= 0 ? dataUrl.slice(comma + 1) : '';
        const bytes = dataUrl.includes(';base64,') ? Math.floor((payload.length * 3) / 4) : payload.length;
        if (bytes > 1024 * 1024) throw new ApiError('validation', 'The logo must be under 1 MB.', 'logo');
      }
      store.dispatch({ type: 'factory/logoSet', factoryUuid, dataUrl });
      return sel.selectFactoryProfile(state(), factoryUuid);
    },

    /** GET /api/v1/factories/{uuid}/centres */
    async listCentres(factoryUuid: Uuid): Promise<CentreSummary[]> {
      await wait();
      return sel.selectCentres(state(), factoryUuid, demoNow());
    },

    /** GET /api/v1/factories/{factoryUuid}/centres/{centreUuid} */
    async getCentre(factoryUuid: Uuid, centreUuid: Uuid): Promise<CentreDetail> {
      await wait();
      return found(sel.selectCentreDetail(state(), factoryUuid, centreUuid, demoNow()), 'Buying centre');
    },

    /** GET /api/v1/factories/{factoryUuid}/deliveries?centre=&status=&search=&from=&to= */
    async listDeliveries(req: ListDeliveriesRequest): Promise<DeliveryRow[]> {
      await wait();
      const { factoryUuid, ...filters } = req;
      return sel.selectFactoryDeliveries(state(), factoryUuid, filters);
    },

    /** GET /api/v1/factories/{factoryUuid}/deliveries/{uuid} — includes linked corrections. */
    async getDelivery(factoryUuid: Uuid, deliveryUuid: Uuid): Promise<DeliveryDetail> {
      await wait();
      return found(sel.selectFactoryDelivery(state(), factoryUuid, deliveryUuid), 'Delivery');
    },

    /**
     * POST /api/v1/deliveries/{uuid}/corrections
     * Append-only: creates a reversal (−kg) and a corrected entry; the original is marked Corrected.
     */
    async correctDelivery(deliveryUuid: Uuid, req: CorrectDeliveryRequest): Promise<CorrectDeliveryResponse> {
      await wait();
      const actor = staffOrDefault(req.actorUuid, state().demo.unitManagerUuid);
      const cmd = buildCorrection(deliveryUuid, req, actor, null);
      const error = validateCorrection(state(), cmd);
      if (error) fail(error);
      const s = store.dispatch({ type: 'delivery/corrected', command: cmd });
      const get = (uuid: Uuid): DeliveryRow => sel.toDeliveryRow(s, found(s.deliveries.find((d) => d.uuid === uuid), 'Delivery'));
      return { original: get(deliveryUuid), reversal: get(cmd.reversalUuid), corrected: get(cmd.correctedUuid) };
    },

    /** GET /api/v1/factories/{factoryUuid}/farmers?centre=&search= */
    async listFarmers(req: ListFarmersRequest): Promise<FactoryFarmerRow[]> {
      await wait();
      const filters: { centreUuid?: Uuid; search?: string } = {};
      if (req.centreUuid) filters.centreUuid = req.centreUuid;
      if (req.search) filters.search = req.search;
      return sel.selectFactoryFarmers(state(), req.factoryUuid, filters, demoNow());
    },

    /** GET /api/v1/factories/{factoryUuid}/farmers/{farmerUuid} — this factory's membership(s) only. */
    async getFarmer(factoryUuid: Uuid, farmerUuid: Uuid): Promise<FactoryFarmerDetail> {
      await wait();
      return found(sel.selectFactoryFarmerDetail(state(), factoryUuid, farmerUuid, demoNow()), 'Farmer');
    },

    /** GET /api/v1/centres/{centreUuid}/farmer-numbers/next */
    async suggestFarmerNumber(centreUuid: Uuid): Promise<string> {
      await wait();
      found(state().centres.find((c) => c.uuid === centreUuid), 'Buying centre');
      return nextFarmerNumber(state(), centreUuid);
    },

    /** POST /api/v1/factories/{factoryUuid}/farmers — farmer number must be unique within the centre. */
    async registerFarmer(req: RegisterFarmerRequest): Promise<RegisterFarmerResponse> {
      await wait();
      const centre = found(state().centres.find((c) => c.uuid === req.centreUuid), 'Buying centre');
      if (centre.factoryUuid !== req.factoryUuid) throw new ApiError('forbidden', 'This buying centre belongs to another factory.', 'centreUuid');
      const command = {
        farmerUuid: newUuid(),
        membershipUuid: newUuid(),
        name: req.name,
        phone: req.phone,
        nationalId: req.nationalId,
        centreUuid: req.centreUuid,
        farmerNumber: req.farmerNumber,
        at: demoNow(),
      };
      const error = validateRegisterFarmer(state(), command);
      if (error) fail(error);
      const s = store.dispatch({ type: 'farmer/registered', command });
      const m = found(s.memberships.find((x) => x.uuid === command.membershipUuid), 'Membership');
      const farmer = found(s.farmers.find((x) => x.uuid === m.farmerUuid), 'Farmer');
      return {
        farmerUuid: farmer.uuid,
        membershipUuid: m.uuid,
        readableId: farmer.readableId,
        farmerRef: formatFarmerRef(centre.code, m.farmerNumber),
        name: farmer.name,
        existingFarmer: farmer.uuid !== command.farmerUuid,
      };
    },

    /** GET /api/v1/factories/{factoryUuid}/pluckers */
    async listPluckers(factoryUuid: Uuid): Promise<FactoryPluckerRow[]> {
      await wait();
      return sel.selectFactoryPluckers(state(), factoryUuid, demoNow());
    },

    /** GET /api/v1/factories/{factoryUuid}/pluckers/{pluckerUuid} — sessions at this factory only. */
    async getPlucker(factoryUuid: Uuid, pluckerUuid: Uuid): Promise<FactoryPluckerDetail> {
      await wait();
      return found(sel.selectFactoryPluckerDetail(state(), factoryUuid, pluckerUuid, demoNow()), 'Plucker');
    },

    /** GET /api/v1/factories/{uuid}/quality */
    async getQualityReport(factoryUuid: Uuid): Promise<QualityReport> {
      await wait();
      return sel.selectQualityReport(state(), factoryUuid, demoNow());
    },

    /** GET /api/v1/factories/{uuid}/bonus/2025-26 — saved inputs, computed lines, declared figure. */
    async getBonus(factoryUuid: Uuid): Promise<BonusReport> {
      await wait();
      found(state().factories.find((f) => f.uuid === factoryUuid), 'Factory');
      return sel.selectBonusReport(state(), factoryUuid);
    },

    /** POST /api/v1/factories/{uuid}/bonus/2025-26/recalculate */
    async recalculateBonus(factoryUuid: Uuid): Promise<BonusRecalculation> {
      await wait();
      return found(sel.selectBonusRecalculation(state(), factoryUuid), 'Saved bonus inputs');
    },

    /** GET /api/v1/factories/{factoryUuid}/farmers/{farmerUuid}/bonus/2025-26 */
    async getFarmerBonus(factoryUuid: Uuid, farmerUuid: Uuid): Promise<FarmerBonus> {
      await wait();
      return found(sel.selectFactoryFarmerBonus(state(), factoryUuid, farmerUuid, demoNow()), 'Farmer');
    },

    /** GET /api/v1/factories/{factoryUuid}/disputes?status= */
    async listDisputes(req: ListDisputesRequest): Promise<DisputeRow[]> {
      await wait();
      return sel.selectFactoryDisputes(state(), req.factoryUuid, req.status ? { status: req.status } : {}, demoNow());
    },

    /** GET /api/v1/factories/{factoryUuid}/disputes/{uuid} */
    async getDispute(factoryUuid: Uuid, disputeUuid: Uuid): Promise<DisputeDetail> {
      await wait();
      return found(sel.selectFactoryDispute(state(), factoryUuid, disputeUuid, demoNow()), 'Dispute');
    },

    /**
     * POST /api/v1/disputes/{uuid}/resolution
     * Uphold (optionally with a correction, applied atomically) or reject (note required).
     */
    async resolveDispute(disputeUuid: Uuid, req: ResolveDisputeRequest): Promise<DisputeDetail> {
      await wait();
      const dispute = found(state().disputes.find((d) => d.uuid === disputeUuid), 'Dispute');
      const actor = staffOrDefault(req.actorUuid, state().demo.unitManagerUuid);
      const correction = req.correction ? buildCorrection(req.correction.deliveryUuid, req.correction, actor, disputeUuid) : null;
      const command = { disputeUuid, outcome: req.outcome, note: req.note, at: demoNow(), byUuid: actor.uuid, byName: actor.name, correction };
      const error = validateResolveDispute(state(), command);
      if (error) fail(error);
      const s = store.dispatch({ type: 'dispute/resolved', command });
      return found(sel.selectFactoryDispute(s, dispute.factoryUuid, disputeUuid, demoNow()), 'Dispute');
    },

    /* ================================================================ */
    /* Audit                                                            */
    /* ================================================================ */

    /** GET /api/v1/factories/{uuid}/audit */
    async getAuditOverview(factoryUuid: Uuid): Promise<AuditOverview> {
      await wait();
      found(state().factories.find((f) => f.uuid === factoryUuid), 'Factory');
      return sel.selectAuditOverview(state(), factoryUuid, demoNow());
    },

    /** GET /api/v1/factories/{uuid}/audit/sealed-days */
    async listSealedDays(factoryUuid: Uuid): Promise<SealedDay[]> {
      await wait();
      return sel.selectSealedDays(state(), factoryUuid);
    },

    /** POST /api/v1/factories/{uuid}/audit/verify — recomputes every sealed day from the ledger. */
    async verifyAuditChain(factoryUuid: Uuid): Promise<ChainVerification> {
      await wait();
      found(state().factories.find((f) => f.uuid === factoryUuid), 'Factory');
      const result = sel.selectChainVerification(state(), factoryUuid, demoNow());
      store.dispatch({
        type: 'audit/chainVerified',
        factoryUuid,
        at: result.verifiedAt,
        intact: result.ok,
        failedDate: result.firstFailure ? result.firstFailure.date : null,
        dayCount: result.days.length,
      });
      const me = staffOrDefault(undefined, state().demo.unitManagerUuid);
      log({
        actorName: me.name,
        actorRole: me.role,
        action: 'verify',
        description: result.ok ? `Verified the audit chain: ${result.message.toLowerCase()}` : 'Verified the audit chain: a sealed day does not match',
        factoryUuid,
        farmerUuid: null,
      });
      return result;
    },

    /** POST /api/v1/demo/factories/{uuid}/tamper — demo only: silently changes one old delivery's kg. */
    async simulateTampering(factoryUuid: Uuid): Promise<AuditOverview> {
      await wait();
      store.dispatch({ type: 'audit/tamperingSimulated', factoryUuid });
      return sel.selectAuditOverview(state(), factoryUuid, demoNow());
    },

    /** DELETE /api/v1/demo/factories/{uuid}/tamper — demo only: restores the original kg. */
    async restoreTampering(factoryUuid: Uuid): Promise<AuditOverview> {
      await wait();
      store.dispatch({ type: 'audit/tamperingRestored' });
      return sel.selectAuditOverview(state(), factoryUuid, demoNow());
    },

    /** GET /api/v1/audit-packs?factory= */
    async listAuditPacks(factoryUuid: Uuid | null): Promise<AuditPack[]> {
      await wait();
      return sel.selectAuditPacks(state(), factoryUuid);
    },

    /** POST /api/v1/factories/{uuid}/audit-packs  { month } */
    async prepareAuditPack(factoryUuid: Uuid, month: MonthKey, actor: AuditActor = 'factory'): Promise<AuditPack> {
      await wait();
      const factory = found(state().factories.find((f) => f.uuid === factoryUuid), 'Factory');
      if (!/^\d{4}-\d{2}$/.test(month)) throw new ApiError('validation', 'Choose a month.', 'month');
      if (month > monthKeyOf(DEMO_TODAY)) throw new ApiError('validation', 'You cannot prepare a pack for a future month.', 'month');
      const person = staffOrDefault(undefined, actor === 'county' ? state().demo.countyAuditorUuid : state().demo.unitManagerUuid);
      const uuid = newUuid();
      const s = store.dispatch({ type: 'audit/packPrepared', command: { uuid, factoryUuid, month, at: demoNow(), byName: person.name } });
      log({
        actorName: person.name,
        actorRole: person.role,
        action: 'prepare',
        description: `Prepared the ${factory.shortName} audit pack for ${month}`,
        factoryUuid,
        farmerUuid: null,
      });
      return found(s.auditPacks.find((p) => p.uuid === uuid), 'Audit pack');
    },

    /** GET /api/v1/factories/{uuid}/access-log */
    async listAccessLog(factoryUuid: Uuid): Promise<AccessLogView[]> {
      await wait();
      return sel.selectFactoryAccessLog(state(), factoryUuid);
    },

    /** POST /api/v1/access-log — record a view or export of farmer-level data by an auditor. */
    async logAccess(entry: LogAccessRequest): Promise<void> {
      await wait();
      log(entry);
    },

    /* ================================================================ */
    /* Clerk                                                            */
    /* ================================================================ */

    /** GET /api/v1/devices/{deviceId}/home */
    async getClerkHome(deviceId: DeviceId): Promise<ClerkHome> {
      await wait();
      return found(sel.selectClerkHome(state(), deviceId, demoNow()), 'Device');
    },

    /** PUT /api/v1/devices/{deviceId}/connectivity — demo control for Online / Offline. */
    async setDeviceOnline(deviceId: DeviceId, online: boolean): Promise<ClerkHome> {
      await wait();
      found(state().devices.find((d) => d.deviceId === deviceId), 'Device');
      store.dispatch({ type: 'device/connectivitySet', deviceId, online, at: demoNow() });
      return found(sel.selectClerkHome(state(), deviceId, demoNow()), 'Device');
    },

    /** GET /api/v1/centres/{centreUuid}/farmers/lookup?q= */
    async lookupFarmer(req: LookupFarmerRequest): Promise<FarmerLookupResult> {
      await wait();
      const result = sel.lookupFarmerAtCentre(state(), req.centreUuid, req.query);
      if ('code' in result) fail(result);
      return result;
    },

    /** Device-side: simulated QR card scan. Picks the demo farmer when at their centre. */
    async scanQrCard(centreUuid: Uuid): Promise<FarmerLookupResult> {
      await wait(400, 700);
      const s = state();
      const farmer = found(s.farmers.find((f) => f.uuid === s.demo.farmerUuid), 'Farmer');
      const result = sel.lookupFarmerAtCentre(s, centreUuid, farmer.readableId);
      if ('code' in result) fail(result);
      return result;
    },

    /** GET /api/v1/farmers/{farmerUuid}/pluckers */
    async listLinkedPluckers(farmerUuid: Uuid): Promise<PluckerRef[]> {
      await wait();
      return sel.selectLinkedPluckers(state(), farmerUuid);
    },

    /** Device-side: read the connected scale (about 1 second). 18–48 kg, one decimal. */
    async readScale(scaleId: string): Promise<ScaleReading> {
      await wait(900, 1100);
      const kg = Math.round((18 + Math.random() * 30) * 10) / 10;
      return { scaleId, kg, readAt: demoNow() };
    },

    /** Device-side: score the leaf sample photo with the on-device model. */
    async scoreLeafSample(deviceId: DeviceId): Promise<LeafSampleScore> {
      await wait(900, 1400);
      const compact = deviceId.replace(/^DEV-/, '').replace(/-\d+$/, '');
      const stamp = demoNow().slice(0, 10).replace(/-/g, '');
      return {
        photoRef: `IMG-${compact}-${stamp}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`,
        aiFineLeafPct: 52 + Math.floor(Math.random() * 21),
        modelVersion: 'leafnet-2026.09',
      };
    },

    /**
     * POST /api/v1/devices/{deviceId}/deliveries
     * Online: saved and synced with a readable ID. Offline: saved as pending with a temporary ID.
     */
    async createDelivery(req: CreateDeliveryRequest): Promise<CreateDeliveryResponse> {
      await wait();
      const command = {
        uuid: newUuid(),
        deviceId: req.deviceId,
        membershipUuid: req.membershipUuid,
        pluckerUuid: req.pluckerUuid,
        kg: req.kg,
        scaleId: req.scaleId,
        aiFineLeafPct: req.aiFineLeafPct,
        fineLeafPct: req.fineLeafPct,
        qualityAdjustReason: req.qualityAdjustReason ?? null,
        photoRef: req.photoRef,
        recordedAt: demoNow(),
      };
      const error = validateRecordDelivery(state(), command);
      if (error) fail(error);
      const s = store.dispatch({ type: 'delivery/recorded', command });
      const d = found(s.deliveries.find((x) => x.uuid === command.uuid), 'Delivery');
      const farmer = found(s.farmers.find((f) => f.uuid === d.farmerUuid), 'Farmer');
      return { delivery: sel.toDeliveryDetail(s, d, d.factoryUuid), synced: d.status === 'synced', smsTo: maskPhone(farmer.phone) };
    },

    /** GET /api/v1/centres/{centreUuid}/deliveries?date=today */
    async listTodayDeliveries(centreUuid: Uuid): Promise<DeliveryRow[]> {
      await wait();
      return sel.selectCentreToday(state(), centreUuid, demoNow());
    },

    /** GET /api/v1/devices/{deviceId}/pending */
    async listPendingDeliveries(deviceId: DeviceId): Promise<DeliveryRow[]> {
      await wait();
      return sel.selectPendingForDevice(state(), deviceId);
    },

    /** POST /api/v1/devices/{deviceId}/sync — assigns readable IDs, keeps the same UUIDs. */
    async syncPending(deviceId: DeviceId): Promise<SyncResult> {
      await wait();
      const device = found(state().devices.find((d) => d.deviceId === deviceId), 'Device');
      if (!device.online) throw new ApiError('offline', 'You are offline. Connect to sync.');
      const pending = sel.selectPendingForDevice(state(), deviceId).map((r) => r.uuid);
      const count = pending.length + device.unlistedPendingCount;
      const s = store.dispatch({ type: 'device/synced', deviceId, at: demoNow() });
      const rows = pending.map((uuid) => sel.toDeliveryRow(s, found(s.deliveries.find((d) => d.uuid === uuid), 'Delivery')));
      return {
        syncedCount: count,
        deliveries: rows,
        message: count === 0 ? 'Nothing to sync' : `${count} ${count === 1 ? 'delivery' : 'deliveries'} synced`,
      };
    },

    /* ================================================================ */
    /* Farmer (combined across memberships)                             */
    /* ================================================================ */

    /** GET /api/v1/farmers/{uuid}/home?period= */
    async getFarmerHome(farmerUuid: Uuid, period: FarmerPeriod): Promise<FarmerHome> {
      await wait();
      return found(sel.selectFarmerHome(state(), farmerUuid, period, demoNow()), 'Farmer');
    },

    /** GET /api/v1/farmers/{uuid}/deliveries?membership= */
    async listFarmerDeliveries(farmerUuid: Uuid, filters: { membershipUuid?: Uuid } = {}): Promise<FarmerDeliveryRow[]> {
      await wait();
      return sel.selectFarmerDeliveries(state(), farmerUuid, filters);
    },

    /** GET /api/v1/farmers/{uuid}/deliveries/{deliveryUuid} */
    async getFarmerDelivery(farmerUuid: Uuid, deliveryUuid: Uuid): Promise<FarmerDeliveryDetail> {
      await wait();
      return found(sel.selectFarmerDelivery(state(), farmerUuid, deliveryUuid), 'Delivery');
    },

    /** GET /api/v1/farmers/{uuid}/payments — last 6 months per centre, plus FY bonus per factory. */
    async getFarmerPayments(farmerUuid: Uuid): Promise<FarmerPayments> {
      await wait();
      return sel.selectFarmerPayments(state(), farmerUuid, demoNow());
    },

    /** GET /api/v1/farmers/{uuid}/disputes */
    async listFarmerDisputes(farmerUuid: Uuid): Promise<FarmerDisputeRow[]> {
      await wait();
      return sel.selectFarmerDisputes(state(), farmerUuid);
    },

    /** POST /api/v1/farmers/{uuid}/disputes — "Report a problem". 7-day response deadline. */
    async openDispute(req: OpenDisputeRequest): Promise<FarmerDisputeRow> {
      await wait();
      const m = found(state().memberships.find((x) => x.uuid === req.membershipUuid), 'Membership');
      if (m.farmerUuid !== req.farmerUuid) throw new ApiError('forbidden', 'This membership is not yours.', 'membershipUuid');
      const command = { uuid: newUuid(), membershipUuid: req.membershipUuid, deliveryUuid: req.deliveryUuid, reason: req.reason, note: req.note, at: demoNow() };
      const error = validateOpenDispute(state(), command);
      if (error) fail(error);
      const s = store.dispatch({ type: 'dispute/opened', command });
      return found(sel.selectFarmerDisputes(s, req.farmerUuid).find((d) => d.uuid === command.uuid), 'Dispute');
    },

    /** GET /api/v1/farmers/{uuid}/profile */
    async getFarmerProfile(farmerUuid: Uuid): Promise<FarmerProfile> {
      await wait();
      return found(sel.selectFarmerProfile(state(), farmerUuid), 'Farmer');
    },

    /* ================================================================ */
    /* Plucker                                                          */
    /* ================================================================ */

    /** GET /api/v1/pluckers/{uuid}/home */
    async getPluckerHome(pluckerUuid: Uuid): Promise<PluckerHome> {
      await wait();
      return found(sel.selectPluckerHome(state(), pluckerUuid, demoNow()), 'Plucker');
    },

    /** GET /api/v1/pluckers/{uuid}/sessions?farmer= */
    async listPluckerSessions(pluckerUuid: Uuid, filters: { farmerUuid?: Uuid } = {}): Promise<PluckerSession[]> {
      await wait();
      return sel.selectPluckerSessions(state(), pluckerUuid, filters);
    },

    /** GET /api/v1/pluckers/{uuid}/profile */
    async getPluckerProfile(pluckerUuid: Uuid): Promise<PluckerProfile> {
      await wait();
      return found(sel.selectPluckerProfile(state(), pluckerUuid, demoNow()), 'Plucker');
    },

    /* ================================================================ */
    /* Demo                                                             */
    /* ================================================================ */

    /** POST /api/v1/demo/reset — restores the seed everywhere. */
    async resetDemo(): Promise<void> {
      await wait();
      store.dispatch({ type: 'demo/reset' });
    },
  };
}

/** The API object type. */
export type Api = ReturnType<typeof createApi>;
