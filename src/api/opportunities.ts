import { API_URL, authHeaders } from "./config";
import type { OpportunitiesResponse } from "./types";

export type OpportunityStrategyType =
  | "funding_arbitrage"
  | "basis_convergence"
  | "cash_and_carry";

export type OpportunitiesFilterOptions = {
  strategyTypes?: OpportunityStrategyType[];
};

export const OPPORTUNITIES_QUERY_KEY = ["opportunities"] as const;

function normalizeStrategyTypes(
  strategyTypes: OpportunityStrategyType[] | undefined
): OpportunityStrategyType[] {
  if (!strategyTypes || strategyTypes.length === 0) {
    return [];
  }
  return [...new Set(strategyTypes)].sort();
}

export function opportunitiesQueryKey(
  options?: OpportunitiesFilterOptions
): readonly ["opportunities"] | readonly ["opportunities", ...OpportunityStrategyType[]] {
  const normalized = normalizeStrategyTypes(options?.strategyTypes);
  return normalized.length > 0 ? (["opportunities", ...normalized] as const) : OPPORTUNITIES_QUERY_KEY;
}

export async function fetchOpportunities(
  options?: OpportunitiesFilterOptions
): Promise<OpportunitiesResponse> {
  const normalized = normalizeStrategyTypes(options?.strategyTypes);
  const url = new URL(`${API_URL}/opportunities`);
  for (const strategyType of normalized) {
    url.searchParams.append("strategy_type", strategyType);
  }
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GET /opportunities failed: ${res.status}`);
  }
  return res.json();
}
