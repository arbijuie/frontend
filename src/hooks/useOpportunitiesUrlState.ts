import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  decodeUrlState,
  encodeUrlState,
  isDefaultState,
  DEFAULT_URL_STATE,
  type OpportunitiesUrlState,
  type SortKey,
  type StatusFilter,
  type StrategyFilter,
} from "../lib/opportunitiesUrlState";

export function useOpportunitiesUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = decodeUrlState(searchParams);
  const currentRef = useRef(searchParams);

  useEffect(() => {
    currentRef.current = searchParams;
  }, [searchParams]);

  const commit = useCallback(
    (build: (current: URLSearchParams) => URLSearchParams, replace: boolean) => {
      const current = currentRef.current;
      const next = build(current);
      if (next.toString() === current.toString()) {
        return;
      }
      setSearchParams(next, { replace });
    },
    [setSearchParams]
  );

  const updateState = useCallback(
    (partial: Partial<OpportunitiesUrlState>, replace = false) =>
      commit(
        (current) => encodeUrlState({ ...decodeUrlState(current), ...partial }, current),
        replace
      ),
    [commit]
  );

  const setSortKey = useCallback((sortKey: SortKey) => updateState({ sortKey }), [updateState]);
  const setStatusFilter = useCallback(
    (statusFilter: StatusFilter) => updateState({ statusFilter }),
    [updateState]
  );
  const setStrategyFilter = useCallback(
    (strategyFilter: StrategyFilter) => updateState({ strategyFilter }),
    [updateState]
  );
  const setSearch = useCallback((search: string) => updateState({ search }, true), [updateState]);

  const resetToDefaults = useCallback(
    () => commit((current) => encodeUrlState(DEFAULT_URL_STATE, current), false),
    [commit]
  );

  return {
    ...state,
    isDefault: isDefaultState(state),
    setSortKey,
    setStatusFilter,
    setStrategyFilter,
    setSearch,
    resetToDefaults,
  };
}
