/**
 * Plucker selectors: one plucker's own picking sessions across the farmers they work for.
 */
import type { AppState, Delivery, IsoDateTime, PluckerHome, PluckerProfile, PluckerSession, Uuid } from '../../types';
import { fnv1a64 } from '../../lib/hash';
import { sumKg, weightedPct } from '../../lib/kg';
import { isEffective } from '../../lib/ledger';
import { FINE_LEAF_TARGET, addDays, dateKeyOf, monthKeyOf, startOfWeek } from '../../lib/time';
import { byRecordedDesc, indexOf, pluckerRef } from './common';
import { toSession } from './factory';

function sessionsOf(state: AppState, pluckerUuid: Uuid): Delivery[] {
  return state.deliveries.filter((d) => d.pluckerUuid === pluckerUuid && isEffective(d)).sort(byRecordedDesc);
}

export function selectPluckerSessions(state: AppState, pluckerUuid: Uuid, filters: { farmerUuid?: Uuid; limit?: number } = {}): PluckerSession[] {
  const list = sessionsOf(state, pluckerUuid)
    .filter((d) => !filters.farmerUuid || d.farmerUuid === filters.farmerUuid)
    .map((d) => toSession(state, d));
  return filters.limit ? list.slice(0, filters.limit) : list;
}

export function selectPluckerHome(state: AppState, pluckerUuid: Uuid, now: IsoDateTime): PluckerHome | null {
  const p = indexOf(state).pluckers.get(pluckerUuid);
  if (!p) return null;
  const today = dateKeyOf(now);
  const weekStart = startOfWeek(today);
  const month = monthKeyOf(today);
  const sessions = sessionsOf(state, pluckerUuid);
  const thisMonth = sessions.filter((d) => monthKeyOf(d.recordedAt) === month);
  return {
    plucker: pluckerRef(p),
    kgThisWeek: sumKg(sessions.filter((d) => dateKeyOf(d.recordedAt) >= weekStart).map((d) => d.kg)),
    kgThisMonth: sumKg(thisMonth.map((d) => d.kg)),
    sessionsThisMonth: thisMonth.length,
    avgFineLeafPct: weightedPct(thisMonth.map((d) => ({ kg: d.kg, pct: d.fineLeafPct }))),
    farmerCount: p.farmerUuids.length,
    target: FINE_LEAF_TARGET,
  };
}

export function selectPluckerProfile(state: AppState, pluckerUuid: Uuid, now: IsoDateTime): PluckerProfile | null {
  const idx = indexOf(state);
  const p = idx.pluckers.get(pluckerUuid);
  if (!p) return null;
  const since = addDays(dateKeyOf(now), -30);
  const recent = sessionsOf(state, pluckerUuid).filter((d) => dateKeyOf(d.recordedAt) >= since);
  return {
    ...pluckerRef(p),
    phone: p.phone,
    joinedOn: p.joinedOn,
    farmers: p.farmerUuids
      .map((fu) => idx.farmers.get(fu))
      .filter((f): f is NonNullable<typeof f> => f !== undefined)
      .map((f) => ({ uuid: f.uuid, name: f.name, readableId: f.readableId })),
    avgFineLeafPct: weightedPct(recent.map((d) => ({ kg: d.kg, pct: d.fineLeafPct }))),
    qrSeed: fnv1a64(p.readableId),
  };
}
