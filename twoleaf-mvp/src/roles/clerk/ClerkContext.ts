/**
 * Clerk app state that must survive switching tabs: the in-progress delivery
 * (Record flow), the live clerk Home and the Sync badge override. All live in <ClerkApp>.
 * Toasts come from the design-system ToastProvider (useToast).
 */
import { createContext, useContext } from 'react';
import type { CreateDeliveryResponse, LeafSampleScore, ScaleReading } from '../../api';
import type { ClerkHome, FarmerLookupResult, PluckerRef } from '../../types';

export type RecordStep = 1 | 2 | 3 | 4 | 5 | 6;

export const RECORD_STEPS: ReadonlyArray<{ step: RecordStep; label: string }> = [
  { step: 1, label: 'Farmer' },
  { step: 2, label: 'Plucker' },
  { step: 3, label: 'Weigh' },
  { step: 4, label: 'Leaf sample' },
  { step: 5, label: 'Confirm' },
  { step: 6, label: 'Receipt' },
];

/** Who picked the leaf: a linked plucker, or the farmer. */
export type PickedBy = { kind: 'plucker'; plucker: PluckerRef } | { kind: 'farmer' };

export interface RecordDraft {
  step: RecordStep;
  farmer: FarmerLookupResult | null;
  pickedBy: PickedBy | null;
  reading: ScaleReading | null;
  sample: LeafSampleScore | null;
  /** Clerk-confirmed fine leaf %, within ±5 of the AI estimate. */
  fineLeafPct: number | null;
  adjustReason: string;
  saved: CreateDeliveryResponse | null;
}

export const EMPTY_DRAFT: RecordDraft = {
  step: 1,
  farmer: null,
  pickedBy: null,
  reading: null,
  sample: null,
  fineLeafPct: null,
  adjustReason: '',
  saved: null,
};

/**
 * The step the flow can really show: never past a step whose data is missing
 * (e.g. after Reset demo data), so every step can rely on what came before.
 */
export function effectiveStep(d: RecordDraft): RecordStep {
  if (d.step === 6) return d.saved ? 6 : d.farmer ? 5 : 1;
  if (d.step >= 2 && !d.farmer) return 1;
  if (d.step >= 3 && !d.pickedBy) return 2;
  if (d.step >= 4 && !d.reading) return 3;
  if (d.step >= 5 && (!d.sample || d.fineLeafPct === null)) return 4;
  return d.step;
}

export interface RecordDraftContextValue {
  draft: RecordDraft;
  update: (patch: Partial<RecordDraft>) => void;
  reset: () => void;
}

export const RecordDraftContext = createContext<RecordDraftContextValue | null>(null);

export function useRecordDraft(): RecordDraftContextValue {
  const v = useContext(RecordDraftContext);
  if (!v) throw new Error('useRecordDraft must be used inside ClerkApp');
  return v;
}

/**
 * Live clerk Home data loaded once by <ClerkApp> (refreshes on every store change).
 * Steps read the scale IDs and Online / Offline from here instead of refetching.
 */
export const ClerkHomeContext = createContext<ClerkHome | undefined>(undefined);

export function useClerkHomeSnapshot(): ClerkHome | undefined {
  return useContext(ClerkHomeContext);
}

/**
 * Sets a temporary Sync tab count (e.g. 0 right after Sync now) until fresh clerk
 * Home data arrives, so the badge clears together with the toast.
 */
export const ClerkPendingBadgeContext = createContext<(count: number) => void>(() => undefined);

export function useSetPendingBadge(): (count: number) => void {
  return useContext(ClerkPendingBadgeContext);
}
