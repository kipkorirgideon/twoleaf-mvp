import { createContext, useContext } from 'react';
import type { Session, Uuid } from '../../types';

/** Who the county app acts as. Provided by CountyApp once the session has loaded. */
export interface CountyShell {
  session: Session;
  /** Kericho County's UUID: use it for every county API call. */
  countyUuid: Uuid;
}

export const CountyShellContext = createContext<CountyShell | null>(null);

/** The county session for pages inside CountyApp. */
export function useCountyShell(): CountyShell {
  const v = useContext(CountyShellContext);
  if (!v) throw new Error('useCountyShell must be used inside CountyApp');
  return v;
}
