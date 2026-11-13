/**
 * The single app store: React Context + useReducer.
 *
 * The fake API needs to read the state *right after* it dispatches (to return the saved
 * record), which `useReducer` alone cannot offer. So `dispatch` here runs the same pure
 * reducer on a ref mirror synchronously and also hands the action to React. Both apply
 * identical actions in identical order, so they always agree.
 */
import { useMemo, useReducer, useRef, type ReactNode } from 'react';
import { createApi, type StoreHandle } from '../api/client';
import { createSeedState, logSeedSummary } from '../data/seed';
import type { AppState } from '../types';
import type { Action } from './actions';
import { StoreContext, type StoreContextValue } from './context';
import { reducer } from './reducer';

let seedLogged = false;

function initState(): AppState {
  const state = createSeedState();
  if (!seedLogged) {
    seedLogged = true;
    logSeedSummary(state);
  }
  return state;
}

export interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [state, reactDispatch] = useReducer(reducer, undefined, initState);
  const mirror = useRef<AppState>(state);

  const handle = useMemo<StoreHandle>(
    () => ({
      getState: () => mirror.current,
      dispatch: (action: Action) => {
        mirror.current = reducer(mirror.current, action);
        reactDispatch(action);
        return mirror.current;
      },
    }),
    [],
  );
  const api = useMemo(() => createApi(handle), [handle]);
  const value = useMemo<StoreContextValue>(() => ({ state, dispatch: handle.dispatch, api }), [state, handle, api]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
