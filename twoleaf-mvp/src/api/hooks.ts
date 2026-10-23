/**
 * React hooks for the fake API.
 *
 *   const api = useApi();
 *   const { data, initialLoading, error } = useQuery((api) => api.getFactoryDashboard(factoryUuid), [factoryUuid]);
 *   const save = useMutation((api, payload: CreateDeliveryRequest) => api.createDelivery(payload));
 *
 * `useQuery` refetches whenever its deps change and whenever the store changes (any
 * write in any role), keeping the previous data on screen while it refreshes, so
 * cross-role updates appear without a loading flash.
 */
import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { useStoreContext } from '../store/context';
import type { Api } from './client';
import { ApiError } from './types';

export function useApi(): Api {
  return useStoreContext().api;
}

function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError('validation', e instanceof Error ? e.message : 'Something went wrong. Try again.');
}

export interface QueryResult<T> {
  data: T | undefined;
  error: ApiError | null;
  /** A request is in flight (including background refreshes). */
  loading: boolean;
  /** In flight and nothing to show yet: render skeletons. */
  initialLoading: boolean;
  reload: () => void;
}

export interface QueryOptions {
  /** Refetch when the store changes (default true). */
  live?: boolean;
  /** Skip fetching (e.g. until an ID is known). */
  enabled?: boolean;
}

export function useQuery<T>(fetcher: (api: Api) => Promise<T>, deps: DependencyList, options: QueryOptions = {}): QueryResult<T> {
  const { api, state } = useStoreContext();
  const live = options.live ?? true;
  const enabled = options.enabled ?? true;
  const revision = live ? state.revision : 0;
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<{ data: T | undefined; error: ApiError | null; loading: boolean }>({
    data: undefined,
    error: null,
    loading: enabled,
  });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setResult((r) => ({ ...r, loading: false }));
      return undefined;
    }
    let cancelled = false;
    setResult((r) => ({ ...r, loading: true }));
    fetcherRef.current(api).then(
      (data) => {
        if (!cancelled) setResult({ data, error: null, loading: false });
      },
      (e: unknown) => {
        if (!cancelled) setResult((r) => ({ data: r.data, error: toApiError(e), loading: false }));
      },
    );
    return () => {
      cancelled = true;
    };
    // `deps` are the caller's dependencies; the fetcher itself is read from a ref.
  }, [api, revision, tick, enabled, ...deps]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...result, initialLoading: result.loading && result.data === undefined, reload };
}

export interface MutationResult<A, T> {
  /** Runs the call. Resolves with the result, or rejects with an ApiError (also stored in `error`). */
  run: (args: A) => Promise<T>;
  pending: boolean;
  error: ApiError | null;
  data: T | undefined;
  reset: () => void;
}

export function useMutation<A, T>(call: (api: Api, args: A) => Promise<T>): MutationResult<A, T> {
  const api = useApi();
  const callRef = useRef(call);
  callRef.current = call;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [stateValue, setStateValue] = useState<{ pending: boolean; error: ApiError | null; data: T | undefined }>({
    pending: false,
    error: null,
    data: undefined,
  });
  const run = useCallback(
    async (args: A): Promise<T> => {
      setStateValue((s) => ({ ...s, pending: true, error: null }));
      try {
        const data = await callRef.current(api, args);
        if (mounted.current) setStateValue({ pending: false, error: null, data });
        return data;
      } catch (e) {
        const err = toApiError(e);
        if (mounted.current) setStateValue((s) => ({ ...s, pending: false, error: err }));
        throw err;
      }
    },
    [api],
  );
  const reset = useCallback(() => setStateValue({ pending: false, error: null, data: undefined }), []);
  return { run, ...stateValue, reset };
}
