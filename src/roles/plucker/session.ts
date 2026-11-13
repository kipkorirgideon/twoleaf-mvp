import { createContext, useContext } from 'react';
import type { Uuid } from '../../types';

/** Base path of the plucker app (App.tsx mounts it at `/plucker/*`). */
export const PLUCKER_BASE = '/plucker';

/** Who the plucker app acts as, from `api.getSession('plucker')`. */
export interface PluckerSession {
  personName: string;
  pluckerUuid: Uuid;
}

export const PluckerSessionContext = createContext<PluckerSession | null>(null);

/** The plucker's session. Only used below <PluckerApp>, which renders pages once the session has loaded. */
export function usePluckerSession(): PluckerSession {
  const s = useContext(PluckerSessionContext);
  if (!s) throw new Error('usePluckerSession must be used inside PluckerApp');
  return s;
}
