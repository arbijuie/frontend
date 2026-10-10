import type { OpportunityStatus } from "../api/types";
import { OPPORTUNITY_STRATEGY_TYPES, type OpportunityStrategyType } from "../api/opportunities";

export type SortKey = "priority" | "combined_score" | "funding_diff_apr" | "hours_to_breakeven";
export type StatusFilter = OpportunityStatus | "all";
export type StrategyFilter = "all" | OpportunityStrategyType;

export interface OpportunitiesUrlState {
  sortKey: SortKey;
  statusFilter: StatusFilter;
  search: string;
  strategyFilter: StrategyFilter;
}

export const DEFAULT_URL_STATE: OpportunitiesUrlState = {
  sortKey: "priority",
  statusFilter: "all",
  search: "",
  strategyFilter: "all",
};

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "priority", label: "Priority" },
  { key: "combined_score", label: "Score" },
  { key: "funding_diff_apr", label: "Funding APR" },
  { key: "hours_to_breakeven", label: "Breakeven" },
];

export const STATUS_FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ready", label: "Ready" },
  { key: "watching", label: "Watching" },
  { key: "blocked", label: "Blocked" },
];

const SORT_KEYS: SortKey[] = SORT_OPTIONS.map((option) => option.key);
const STATUS_FILTERS: StatusFilter[] = STATUS_FILTER_OPTIONS.map((option) => option.key);
const STRATEGY_FILTERS: StrategyFilter[] = ["all", ...OPPORTUNITY_STRATEGY_TYPES];

function isSortKey(value: string | null): value is SortKey {
  return SORT_KEYS.includes(value as SortKey);
}

function isStatusFilter(value: string | null): value is StatusFilter {
  return STATUS_FILTERS.includes(value as StatusFilter);
}

function isStrategyFilter(value: string | null): value is StrategyFilter {
  return STRATEGY_FILTERS.includes(value as StrategyFilter);
}

const MANAGED_URL_KEYS = ["sort", "status", "strategy", "q"] as const;

export function decodeUrlState(params: URLSearchParams): OpportunitiesUrlState {
  const sort = params.get("sort");
  const status = params.get("status");
  const strategy = params.get("strategy");
  const search = params.get("q");

  return {
    sortKey: isSortKey(sort) ? sort : DEFAULT_URL_STATE.sortKey,
    statusFilter: isStatusFilter(status) ? status : DEFAULT_URL_STATE.statusFilter,
    strategyFilter: isStrategyFilter(strategy) ? strategy : DEFAULT_URL_STATE.strategyFilter,
    search: search ?? DEFAULT_URL_STATE.search,
  };
}

export function encodeUrlState(
  state: OpportunitiesUrlState,
  baseParams?: URLSearchParams
): URLSearchParams {
  const params = new URLSearchParams(baseParams);
  for (const key of MANAGED_URL_KEYS) {
    params.delete(key);
  }

  if (state.sortKey !== DEFAULT_URL_STATE.sortKey) {
    params.set("sort", state.sortKey);
  }
  if (state.statusFilter !== DEFAULT_URL_STATE.statusFilter) {
    params.set("status", state.statusFilter);
  }
  if (state.strategyFilter !== DEFAULT_URL_STATE.strategyFilter) {
    params.set("strategy", state.strategyFilter);
  }
  if (state.search.trim() !== "") {
    params.set("q", state.search);
  }

  return params;
}

export function isDefaultState(state: OpportunitiesUrlState): boolean {
  return (
    state.sortKey === DEFAULT_URL_STATE.sortKey &&
    state.statusFilter === DEFAULT_URL_STATE.statusFilter &&
    state.strategyFilter === DEFAULT_URL_STATE.strategyFilter &&
    state.search.trim() === ""
  );
}
