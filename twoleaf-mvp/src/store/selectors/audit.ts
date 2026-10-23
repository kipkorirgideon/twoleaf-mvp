/**
 * Audit selectors: sealed days, chain verification, audit packs and the factory access log.
 */
import type { AccessLogView, AppState, AuditOverview, AuditPack, ChainVerification, IsoDateTime, SealedDay, Uuid } from '../../types';
import { formatDate, formatKg } from '../../lib/format';
import { verifySealedDays } from '../../lib/ledger';
import { dateKeyOf } from '../../lib/time';
import { factoryRef, indexOf, must } from './common';
import { toAccessLogView } from './county';

export const AUDIT_SCOPE_NOTE =
  'Sealed days cover the deliveries listed in this demo. Factory totals elsewhere also include farmers not listed individually.';

export function selectSealedDays(state: AppState, factoryUuid: Uuid): SealedDay[] {
  return state.sealedDays.filter((d) => d.factoryUuid === factoryUuid).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Recompute every sealed day of a factory from the current ledger. */
export function selectChainVerification(state: AppState, factoryUuid: Uuid, now: IsoDateTime): ChainVerification {
  const days = verifySealedDays(selectSealedDays(state, factoryUuid), state.deliveries);
  const firstFailure = days.find((d) => !d.ok) ?? null;
  let message: string;
  if (days.length === 0) message = 'No sealed days yet.';
  else if (!firstFailure) message = `All ${days.length} days intact`;
  else {
    message =
      `Day ${formatDate(firstFailure.date)} does not match its seal. ` +
      `Sealed: ${firstFailure.expected.count} deliveries, ${formatKg(firstFailure.expected.totalKg)}. ` +
      `Found: ${firstFailure.found.count} deliveries, ${formatKg(firstFailure.found.totalKg)}.`;
  }
  return { factoryUuid, verifiedAt: now, ok: firstFailure === null, days, firstFailure, message };
}

export function selectAuditPacks(state: AppState, factoryUuid: Uuid | null): AuditPack[] {
  return state.auditPacks
    .filter((p) => factoryUuid === null || p.factoryUuid === factoryUuid)
    .sort((a, b) => (a.preparedAt < b.preparedAt ? 1 : -1));
}

/** Factory-scope access log (may show which farmer's records were viewed, by TwoLeaf ID). */
export function selectFactoryAccessLog(state: AppState, factoryUuid: Uuid): AccessLogView[] {
  return state.accessLog
    .filter((e) => e.factoryUuid === factoryUuid)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .map((e) => toAccessLogView(state, e, 'factory'));
}

export function selectAuditOverview(state: AppState, factoryUuid: Uuid, now: IsoDateTime): AuditOverview {
  const factory = must(indexOf(state).factories.get(factoryUuid), 'Factory');
  return {
    factory: factoryRef(factory),
    chain: factory.chain,
    sealedDays: selectSealedDays(state, factoryUuid),
    packs: selectAuditPacks(state, factoryUuid),
    accessLog: selectFactoryAccessLog(state, factoryUuid),
    tamperingActive: state.tampering !== null && state.tampering.factoryUuid === factoryUuid,
    openDay: dateKeyOf(now),
    scopeNote: AUDIT_SCOPE_NOTE,
  };
}
