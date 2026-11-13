/**
 * The single reducer. Pure: no randomness, no clock. Invalid actions return the
 * state unchanged (the fake API validates first and reports the error).
 *
 * Ledger rule: deliveries are only ever appended. The only in-place updates are
 * pending → synced on sync (same UUID, readable ID assigned), synced → corrected on
 * an original being corrected, and the demo-only tampering simulation.
 */
import type { AppState, AuditPack, Delivery, Dispute, Farmer, Membership } from '../types';
import { createSeedState } from '../data/seed';
import { auditPackChecksum, deliveryHash } from '../lib/hash';
import { deliveryReadableId, disputeReadableId, farmerReadableId, tempDeliveryId } from '../lib/ids';
import { roundKg, sumKg } from '../lib/kg';
import { isInLedger, ledgerEntriesForDay, nextDeliverySeq, sealedDaysInMonth } from '../lib/ledger';
import { addDays, addDaysIso, dateKeyOf, firstDayOfMonth, monthKeyOf } from '../lib/time';
import type { Action, CorrectionCommand } from './actions';
import {
  DISPUTE_DAYS,
  validateCorrection,
  validateOpenDispute,
  validateRecordDelivery,
  validateRegisterFarmer,
  validateResolveDispute,
} from './rules';
import { indexOf } from './selectors/common';

function assertNever(x: never): never {
  throw new Error(`Unhandled action: ${JSON.stringify(x)}`);
}

/** Issue the next readable delivery ID for a ledger time. */
function issueDeliveryId(state: AppState, enteredAt: string): { readableId: ReturnType<typeof deliveryReadableId>; seqByYear: Record<string, number> } {
  const { year, seq } = nextDeliverySeq(state.counters.deliverySeqByYear, Date.parse(enteredAt));
  return { readableId: deliveryReadableId(year, seq), seqByYear: { ...state.counters.deliverySeqByYear, [String(year)]: seq } };
}

/** Apply an (already validated) correction. Returns the new state. */
function applyCorrection(state: AppState, cmd: CorrectionCommand): AppState {
  const idx = indexOf(state);
  const original = idx.deliveries.get(cmd.originalUuid);
  if (!original) return state;
  const target = cmd.membershipUuid ? idx.memberships.get(cmd.membershipUuid) : idx.memberships.get(original.membershipUuid);
  if (!target) return state;
  const note = { reason: cmd.reason.trim(), byUuid: cmd.byUuid, byName: cmd.byName, at: cmd.at, disputeUuid: cmd.disputeUuid };

  let s = state;
  const first = issueDeliveryId(s, cmd.at);
  s = { ...s, counters: { ...s.counters, deliverySeqByYear: first.seqByYear } };
  const reversalBase: Delivery = {
    ...original,
    key: s.counters.nextKey,
    uuid: cmd.reversalUuid,
    readableId: first.readableId,
    tempId: null,
    enteredAt: cmd.at,
    kg: -original.kg,
    status: 'reversal',
    reversalOf: original.uuid,
    correctionOf: null,
    correction: note,
    hash: '',
  };
  const reversal: Delivery = { ...reversalBase, hash: deliveryHash(reversalBase) };

  const second = issueDeliveryId(s, cmd.at);
  s = { ...s, counters: { ...s.counters, deliverySeqByYear: second.seqByYear } };
  const correctedBase: Delivery = {
    ...original,
    key: s.counters.nextKey + 1,
    uuid: cmd.correctedUuid,
    readableId: second.readableId,
    tempId: null,
    farmerUuid: target.farmerUuid,
    membershipUuid: target.uuid,
    centreUuid: target.centreUuid,
    enteredAt: cmd.at,
    kg: roundKg(cmd.kg),
    status: 'synced',
    reversalOf: null,
    correctionOf: original.uuid,
    correction: note,
    hash: '',
  };
  const corrected: Delivery = { ...correctedBase, hash: deliveryHash(correctedBase) };

  return {
    ...s,
    deliveries: [
      ...s.deliveries.map((d) => (d.uuid === original.uuid ? { ...d, status: 'corrected' as const } : d)),
      reversal,
      corrected,
    ],
    counters: { ...s.counters, nextKey: s.counters.nextKey + 2 },
  };
}

function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'delivery/recorded': {
      const cmd = action.command;
      if (validateRecordDelivery(state, cmd)) return state;
      const idx = indexOf(state);
      const device = idx.devices.get(cmd.deviceId);
      const membership = idx.memberships.get(cmd.membershipUuid);
      const centre = device ? idx.centres.get(device.centreUuid) : undefined;
      if (!device || !membership || !centre) return state;

      let counters = state.counters;
      let readableId: Delivery['readableId'] = null;
      let tempId: string | null = null;
      let tempSeq = device.tempSeq;
      if (device.online) {
        const issued = issueDeliveryId(state, cmd.recordedAt);
        readableId = issued.readableId;
        counters = { ...counters, deliverySeqByYear: issued.seqByYear };
      } else {
        tempSeq += 1;
        tempId = tempDeliveryId(centre.code, tempSeq);
      }
      const base: Delivery = {
        key: counters.nextKey,
        uuid: cmd.uuid,
        readableId,
        tempId,
        farmerUuid: membership.farmerUuid,
        membershipUuid: membership.uuid,
        centreUuid: centre.uuid,
        factoryUuid: centre.factoryUuid,
        recordedAt: cmd.recordedAt,
        enteredAt: device.online ? cmd.recordedAt : null,
        kg: roundKg(cmd.kg),
        aiFineLeafPct: cmd.aiFineLeafPct,
        fineLeafPct: cmd.fineLeafPct,
        qualityAdjustReason: cmd.fineLeafPct !== cmd.aiFineLeafPct ? (cmd.qualityAdjustReason ?? '').trim() : null,
        intakeFineLeafPct: null,
        pluckerUuid: cmd.pluckerUuid,
        clerkUuid: device.clerkUuid,
        scaleId: cmd.scaleId,
        deviceId: device.deviceId,
        photoRef: cmd.photoRef,
        status: device.online ? 'synced' : 'pending',
        hash: '',
        reversalOf: null,
        correctionOf: null,
        correction: null,
      };
      const delivery: Delivery = { ...base, hash: deliveryHash(base) };
      return {
        ...state,
        deliveries: [...state.deliveries, delivery],
        devices: state.devices.map((d) =>
          d.deviceId === device.deviceId ? { ...d, tempSeq, ...(device.online ? { lastSyncAt: cmd.recordedAt } : {}) } : d,
        ),
        counters: { ...counters, nextKey: counters.nextKey + 1 },
      };
    }

    case 'device/synced': {
      const device = indexOf(state).devices.get(action.deviceId);
      if (!device || !device.online) return state;
      let seqByYear = state.counters.deliverySeqByYear;
      const pending = state.deliveries
        .filter((d) => d.deviceId === device.deviceId && d.status === 'pending')
        .sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : a.key - b.key));
      const assigned = new Map<string, Delivery['readableId']>();
      for (const d of pending) {
        const { year, seq } = nextDeliverySeq(seqByYear, Date.parse(action.at));
        seqByYear = { ...seqByYear, [String(year)]: seq };
        assigned.set(d.uuid, deliveryReadableId(year, seq));
      }
      return {
        ...state,
        // Same UUID, now with a readable ID; entered into the factory ledger at sync time.
        deliveries: state.deliveries.map((d) =>
          assigned.has(d.uuid) ? { ...d, readableId: assigned.get(d.uuid) ?? null, enteredAt: action.at, status: 'synced' as const } : d,
        ),
        devices: state.devices.map((d) => (d.deviceId === device.deviceId ? { ...d, lastSyncAt: action.at, unlistedPendingCount: 0 } : d)),
        counters: { ...state.counters, deliverySeqByYear: seqByYear },
      };
    }

    case 'device/connectivitySet': {
      const device = indexOf(state).devices.get(action.deviceId);
      if (!device || device.online === action.online) return state;
      return {
        ...state,
        devices: state.devices.map((d) =>
          d.deviceId === action.deviceId ? { ...d, online: action.online, offlineSince: action.online ? null : action.at } : d,
        ),
      };
    }

    case 'delivery/corrected': {
      if (validateCorrection(state, action.command)) return state;
      return applyCorrection(state, action.command);
    }

    case 'dispute/opened': {
      const cmd = action.command;
      if (validateOpenDispute(state, cmd)) return state;
      const m = indexOf(state).memberships.get(cmd.membershipUuid);
      if (!m) return state;
      const year = cmd.at.slice(0, 4);
      const seq = (state.counters.disputeSeqByYear[year] ?? 0) + 1;
      const dispute: Dispute = {
        key: state.counters.nextKey,
        uuid: cmd.uuid,
        readableId: disputeReadableId(Number(year), seq),
        farmerUuid: m.farmerUuid,
        membershipUuid: m.uuid,
        centreUuid: m.centreUuid,
        factoryUuid: m.factoryUuid,
        deliveryUuid: cmd.deliveryUuid,
        reason: cmd.reason,
        farmerNote: cmd.note.trim(),
        openedAt: cmd.at,
        deadlineAt: addDaysIso(cmd.at, DISPUTE_DAYS),
        status: 'open',
        resolution: null,
      };
      return {
        ...state,
        disputes: [...state.disputes, dispute],
        counters: {
          ...state.counters,
          nextKey: state.counters.nextKey + 1,
          disputeSeqByYear: { ...state.counters.disputeSeqByYear, [year]: seq },
        },
      };
    }

    case 'dispute/resolved': {
      const cmd = action.command;
      if (validateResolveDispute(state, cmd)) return state;
      const s = cmd.correction ? applyCorrection(state, { ...cmd.correction, disputeUuid: cmd.disputeUuid }) : state;
      return {
        ...s,
        disputes: s.disputes.map((d) =>
          d.uuid === cmd.disputeUuid
            ? {
                ...d,
                status: cmd.outcome === 'upheld' ? ('resolved_upheld' as const) : ('resolved_rejected' as const),
                resolution: {
                  outcome: cmd.outcome,
                  note: cmd.note.trim(),
                  resolvedAt: cmd.at,
                  byUuid: cmd.byUuid,
                  byName: cmd.byName,
                  reversalUuid: cmd.correction ? cmd.correction.reversalUuid : null,
                  correctedDeliveryUuid: cmd.correction ? cmd.correction.correctedUuid : null,
                },
              }
            : d,
        ),
      };
    }

    case 'farmer/registered': {
      const cmd = action.command;
      if (validateRegisterFarmer(state, cmd)) return state;
      const centre = indexOf(state).centres.get(cmd.centreUuid);
      if (!centre) return state;
      const existing = state.farmers.find((f) => f.nationalId === cmd.nationalId.trim());
      let counters = state.counters;
      let farmers = state.farmers;
      let farmerUuid = cmd.farmerUuid;
      if (existing) {
        farmerUuid = existing.uuid;
      } else {
        const seq = counters.farmerSeq + 1;
        const farmer: Farmer = {
          key: counters.nextKey,
          uuid: cmd.farmerUuid,
          readableId: farmerReadableId(seq),
          name: cmd.name.trim().replace(/\s+/g, ' '),
          phone: cmd.phone.trim().replace(/^(\d{4})\s?(\d{3})\s?(\d{3})$/, '$1 $2 $3'),
          nationalId: cmd.nationalId.trim(),
          joinedOn: dateKeyOf(cmd.at),
        };
        farmers = [...farmers, farmer];
        counters = { ...counters, farmerSeq: seq, nextKey: counters.nextKey + 1 };
      }
      const membership: Membership = {
        key: counters.nextKey,
        uuid: cmd.membershipUuid,
        farmerUuid,
        factoryUuid: centre.factoryUuid,
        centreUuid: centre.uuid,
        farmerNumber: cmd.farmerNumber.trim(),
        joinedOn: dateKeyOf(cmd.at),
        status: 'active',
      };
      return {
        ...state,
        farmers,
        memberships: [...state.memberships, membership],
        counters: { ...counters, nextKey: counters.nextKey + 1 },
      };
    }

    case 'factory/logoSet': {
      if (!indexOf(state).factories.has(action.factoryUuid)) return state;
      return {
        ...state,
        factories: state.factories.map((f) => (f.uuid === action.factoryUuid ? { ...f, logoDataUrl: action.dataUrl } : f)),
      };
    }

    case 'audit/chainVerified': {
      return {
        ...state,
        factories: state.factories.map((f) =>
          f.uuid === action.factoryUuid
            ? { ...f, chain: { lastVerifiedAt: action.at, intact: action.intact, failedDate: action.failedDate, sealedDayCount: action.dayCount } }
            : f,
        ),
      };
    }

    case 'audit/tamperingSimulated': {
      if (state.tampering) return state;
      const days = state.sealedDays.filter((d) => d.factoryUuid === action.factoryUuid).sort((a, b) => (a.date < b.date ? -1 : 1));
      if (days.length === 0) return state;
      // Prefer 16 Oct 2026 (the spec's example); otherwise a day in the middle of the window.
      const day = days.find((d) => d.date === '2026-10-16') ?? days[Math.floor(days.length / 2)];
      if (!day) return state;
      const target = ledgerEntriesForDay(state.deliveries, action.factoryUuid, day.date).find((d) => d.status === 'synced' && d.kg > 0);
      if (!target) return state;
      const tamperedKg = target.kg > 15 ? roundKg(target.kg - 10) : roundKg(target.kg + 10);
      return {
        ...state,
        // Silently change kg without updating the hash: exactly what tampering would look like.
        deliveries: state.deliveries.map((d) => (d.uuid === target.uuid ? { ...d, kg: tamperedKg } : d)),
        tampering: { factoryUuid: action.factoryUuid, deliveryUuid: target.uuid, date: day.date, originalKg: target.kg, tamperedKg },
      };
    }

    case 'audit/tamperingRestored': {
      const t = state.tampering;
      if (!t) return state;
      return {
        ...state,
        deliveries: state.deliveries.map((d) => (d.uuid === t.deliveryUuid ? { ...d, kg: t.originalKg } : d)),
        tampering: null,
      };
    }

    case 'audit/packPrepared': {
      const cmd = action.command;
      const factory = indexOf(state).factories.get(cmd.factoryUuid);
      if (!factory) return state;
      const today = dateKeyOf(cmd.at);
      // Count sealed days actually held: stored seals for Tegat; for aggregate-only factories,
      // the days of the month inside their verified window (the last `chain.sealedDayCount` days).
      const sealedDayCount =
        factory.detailLevel === 'full'
          ? sealedDaysInMonth(state.sealedDays, factory.uuid, cmd.month)
          : Array.from({ length: factory.chain.sealedDayCount }, (_, i) => addDays(today, -(i + 1))).filter((d) => d.slice(0, 7) === cmd.month).length;
      let deliveryCount: number;
      let totalKg: number;
      let checksum: string;
      if (factory.detailLevel === 'full') {
        const entries = state.deliveries.filter(
          (d) => d.factoryUuid === factory.uuid && isInLedger(d) && d.enteredAt !== null && monthKeyOf(d.enteredAt) === cmd.month,
        );
        deliveryCount = entries.length;
        totalKg = sumKg(entries.map((e) => e.kg));
        checksum = auditPackChecksum(factory.readableId, cmd.month, entries.map((e) => ({ id: e.readableId ?? e.uuid, hash: e.hash })));
      } else {
        const fig = factory.aggregate?.months.find((m) => m.month === cmd.month);
        deliveryCount = fig ? fig.deliveries : 0;
        totalKg = fig ? fig.kg : 0;
        checksum = auditPackChecksum(factory.readableId, cmd.month, [{ id: firstDayOfMonth(cmd.month), hash: `${deliveryCount}:${totalKg}` }]);
      }
      const pack: AuditPack = {
        key: state.counters.nextKey,
        uuid: cmd.uuid,
        factoryUuid: factory.uuid,
        reference: `PACK-${factory.code}-${cmd.month}`,
        month: cmd.month,
        preparedAt: cmd.at,
        preparedByName: cmd.byName,
        status: 'ready',
        deliveryCount,
        totalKg,
        sealedDayCount,
        checksum,
      };
      return { ...state, auditPacks: [...state.auditPacks, pack], counters: { ...state.counters, nextKey: state.counters.nextKey + 1 } };
    }

    case 'accessLog/appended': {
      const c = action.command;
      return {
        ...state,
        accessLog: [...state.accessLog, { key: state.counters.nextKey, ...c }],
        counters: { ...state.counters, nextKey: state.counters.nextKey + 1 },
      };
    }

    case 'demo/reset':
      return { ...createSeedState(), revision: state.revision + 1 };

    default:
      return assertNever(action);
  }
}

/** Reducer used by the store. Bumps `revision` whenever the state actually changed. */
export function reducer(state: AppState, action: Action): AppState {
  const next = reduce(state, action);
  if (next === state || action.type === 'demo/reset') return next;
  return { ...next, revision: state.revision + 1 };
}

