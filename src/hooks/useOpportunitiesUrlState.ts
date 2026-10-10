import { useCallback } from "react";
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

  const updateState = useCallback(
    (partial: Partial<OpportunitiesUrlState>) => {
      setSearchParams((prev) => encodeUrlState({ ...decodeUrlState(prev), ...partial }, prev), {
        replace: true,
      });
    },
    [setSearchParams]
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
  const setSearch = useCallback((search: string) => updateState({ search }), [updateState]);

  const resetToDefaults = useCallback(() => {
    setSearchParams((prev) => encodeUrlState(DEFAULT_URL_STATE, prev), { replace: true });
  }, [setSearchParams]);

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
