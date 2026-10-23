/**
 * County selectors: aggregates only. Nothing returned here contains a farmer's name,
 * TwoLeaf ID, farmer number, phone, delivery or payment. Access log entries are
 * stripped of farmer references.
 */
import type {
  AccessLogEntry,
  AccessLogView,
  AppState,
  AttentionItem,
  CountyAudit,
  CountyDisputeRow,
  CountyFactorySummary,
  CountyOverview,
  CountyQualityRow,
  IsoDateTime,
  Uuid,
} from '../../types';
import { PRIVACY_NOTE } from '../../lib/labels';
import { weightedPct } from '../../lib/kg';
import { FINE_LEAF_TARGET, daysBetween } from '../../lib/time';
import { factoryRef, indexOf, must } from './common';
import { centresOf, selectCentreSummary, selectFactoryOverview } from './factory';

const DISPUTE_RATE_ATTENTION_PCT = 0.5;
const OFFLINE_ATTENTION_HOURS = 2;

export function selectCountyOverview(state: AppState, now: IsoDateTime): CountyOverview {
  const factories = state.factories.map((f) => selectFactoryOverview(state, f.uuid, now));
  const needsAttention: AttentionItem[] = [];
  for (const f of factories) {
    if (f.fineLeafPct < FINE_LEAF_TARGET) {
      needsAttention.push({
        kind: 'below_target',
        factoryUuid: f.uuid,
        factoryName: f.name,
        message: `${f.name} is below the ${FINE_LEAF_TARGET}% fine leaf target at ${Math.round(f.fineLeafPct)}%.`,
        severity: f.fineLeafPct < FINE_LEAF_TARGET - 5 ? 'danger' : 'warning',
      });
    }
    if (f.disputeRatePct > DISPUTE_RATE_ATTENTION_PCT) {
      needsAttention.push({
        kind: 'dispute_rate',
        factoryUuid: f.uuid,
        factoryName: f.name,
        message: `${f.name} has ${f.openDisputes} open disputes, ${f.disputeRatePct.toFixed(2)}% of farmers (above ${DISPUTE_RATE_ATTENTION_PCT}%).`,
        severity: 'warning',
      });
    }
  }
  for (const factory of state.factories) {
    if (factory.detailLevel !== 'full') continue;
    for (const c of centresOf(state, factory.uuid)) {
      const s = selectCentreSummary(state, c.uuid, now);
      if (s.connectivity.status === 'offline' && s.connectivity.offlineHours >= OFFLINE_ATTENTION_HOURS) {
        needsAttention.push({
          kind: 'centre_offline',
          factoryUuid: factory.uuid,
          factoryName: factory.name,
          message: `${c.code} ${c.name} (${factory.shortName}) has been offline for ${s.connectivity.offlineHours} hours with ${s.connectivity.pendingCount} deliveries waiting to sync.`,
          severity: 'danger',
        });
      }
    }
  }
  const order = { centre_offline: 0, dispute_rate: 1, below_target: 2 } as const;
  needsAttention.sort((a, b) => order[a.kind] - order[b.kind]);
  return {
    county: { uuid: state.county.uuid, readableId: state.county.readableId, name: state.county.name, officialCode: state.county.officialCode },
    factoryCount: factories.length,
    farmerCount: factories.reduce((a, f) => a + f.farmerCount, 0),
    kgThisMonth: factories.reduce((a, f) => a + f.kgThisMonth, 0),
    kgToday: factories.reduce((a, f) => a + f.kgToday, 0),
    avgFineLeafPct: weightedPct(factories.map((f) => ({ kg: f.kgThisMonth, pct: f.fineLeafPct }))) ?? 0,
    target: FINE_LEAF_TARGET,
    openDisputes: factories.reduce((a, f) => a + f.openDisputes, 0),
    factories,
    needsAttention,
    prices: state.county.regionalPrices,
  };
}

export function selectCountyFactorySummary(state: AppState, factoryUuid: Uuid, now: IsoDateTime): CountyFactorySummary {
  const factory = must(indexOf(state).factories.get(factoryUuid), 'Factory');
  const overview = selectFactoryOverview(state, factoryUuid, now);
  const centres =
    factory.detailLevel === 'full'
      ? centresOf(state, factoryUuid).map((c) => {
          const s = selectCentreSummary(state, c.uuid, now);
          return { code: s.code, name: s.name, farmerCount: s.farmerCount, kgThisMonth: s.kgThisMonth, ...s.quality };
        })
      : (factory.aggregate?.centres ?? []).map((c) => ({
          code: c.code,
          name: c.name,
          farmerCount: c.farmerCount,
          kgThisMonth: c.kgThisMonth,
          centreFineLeafPct: c.fineLeafPct,
          intakeFineLeafPct: c.intakeFineLeafPct,
          gapPts: c.fineLeafPct - c.intakeFineLeafPct,
        }));
  return { factory: overview, centres, privacyNote: PRIVACY_NOTE };
}

export function selectCountyQuality(state: AppState, now: IsoDateTime): CountyQualityRow[] {
  return state.factories.map((f) => {
    const o = selectFactoryOverview(state, f.uuid, now);
    return {
      factory: factoryRef(f),
      months: o.trend.map((m) => ({ month: m.month, fineLeafPct: m.fineLeafPct, intakeFineLeafPct: m.intakeFineLeafPct })),
      current: { centreFineLeafPct: o.fineLeafPct, intakeFineLeafPct: o.intakeFineLeafPct, gapPts: Math.round((o.fineLeafPct - o.intakeFineLeafPct) * 10) / 10 },
    };
  });
}

export function selectCountyDisputes(state: AppState, now: IsoDateTime): CountyDisputeRow[] {
  return state.factories.map((f) => {
    const o = selectFactoryOverview(state, f.uuid, now);
    if (f.detailLevel === 'aggregate' && f.aggregate) {
      const a = f.aggregate;
      return {
        factory: factoryRef(f),
        openDisputes: a.openDisputes,
        openedThisFy: a.disputesOpenedThisFy,
        resolvedThisFy: a.disputesResolvedThisFy,
        disputeRatePct: o.disputeRatePct,
        avgDaysToResolve: a.avgDaysToResolve,
        oldestOpenAt: a.oldestOpenDisputeAt,
        oldestOpenDays: a.oldestOpenDisputeAt ? daysBetween(a.oldestOpenDisputeAt, now) : null,
      };
    }
    const bg = f.background ?? { disputesOpenedThisFy: 0, disputesResolvedThisFy: 0, totalResolveDays: 0 };
    const own = state.disputes.filter((d) => d.factoryUuid === f.uuid);
    const resolved = own.filter((d) => d.resolution !== null);
    const resolveDays = resolved.reduce((a, d) => a + Math.max(0, daysBetween(d.openedAt, d.resolution?.resolvedAt ?? d.openedAt)), 0);
    const open = own.filter((d) => d.status === 'open').sort((a, b) => (a.openedAt < b.openedAt ? -1 : 1));
    const oldest = open[0]?.openedAt ?? null;
    const resolvedCount = bg.disputesResolvedThisFy + resolved.length;
    return {
      factory: factoryRef(f),
      openDisputes: open.length,
      openedThisFy: bg.disputesOpenedThisFy + own.length,
      resolvedThisFy: resolvedCount,
      disputeRatePct: o.disputeRatePct,
      avgDaysToResolve: resolvedCount > 0 ? Math.round(((bg.totalResolveDays + resolveDays) / resolvedCount) * 10) / 10 : 0,
      oldestOpenAt: oldest,
      oldestOpenDays: oldest ? daysBetween(oldest, now) : null,
    };
  });
}

/** Access log entry as a view. In county scope the farmer reference is always removed. */
export function toAccessLogView(state: AppState, e: AccessLogEntry, scope: 'county' | 'factory'): AccessLogView {
  const idx = indexOf(state);
  const factory = e.factoryUuid ? idx.factories.get(e.factoryUuid) : undefined;
  const farmer = scope === 'factory' && e.farmerUuid ? idx.farmers.get(e.farmerUuid) : undefined;
  return {
    uuid: e.uuid,
    at: e.at,
    actorName: e.actorName,
    actorRole: e.actorRole,
    action: e.action,
    description: e.description,
    factoryName: factory ? factory.name : null,
    farmerReadableId: farmer ? farmer.readableId : null,
  };
}

export function selectCountyAudit(state: AppState): CountyAudit {
  const idx = indexOf(state);
  return {
    factories: state.factories.map((f) => ({
      factory: factoryRef(f),
      chain: f.chain,
      packs: state.auditPacks.filter((p) => p.factoryUuid === f.uuid).sort((a, b) => (a.preparedAt < b.preparedAt ? 1 : -1)),
    })),
    packs: state.auditPacks
      .slice()
      .sort((a, b) => (a.preparedAt < b.preparedAt ? 1 : -1))
      .map((p) => ({ ...p, factoryName: idx.factories.get(p.factoryUuid)?.name ?? '—' })),
    accessLog: state.accessLog
      .slice()
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .map((e) => toAccessLogView(state, e, 'county')),
  };
}

/** Used by tests / QA: true when a county view contains no farmer names. */
export function countyViewHasNoFarmerNames(state: AppState, view: unknown): boolean {
  const text = JSON.stringify(view);
  return state.farmers.every((f) => !text.includes(f.name) && !text.includes(f.readableId));
}

