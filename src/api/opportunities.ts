import { API_URL, authHeaders } from "./config";
import type { OpportunitiesResponse } from "./types";

export type OpportunityStrategyType = "funding_arbitrage" | "basis_convergence" | "cash_and_carry";

export const OPPORTUNITY_STRATEGY_TYPES: readonly OpportunityStrategyType[] = [
  "funding_arbitrage",
  "basis_convergence",
  "cash_and_carry",
];

export const OPPORTUNITY_STRATEGY_LABEL: Record<OpportunityStrategyType, string> = {
  funding_arbitrage: "Funding arbitrage",
  basis_convergence: "Basis convergence",
  cash_and_carry: "Cash and carry",
};

export const OPPORTUNITIES_QUERY_KEY = ["opportunities"] as const;

type FetchOpportunitiesOptions = {
  strategyTypes?: OpportunityStrategyType[];
};

export function opportunitiesQueryKey(options?: FetchOpportunitiesOptions) {
  const strategyTypes = [...(options?.strategyTypes ?? [])].sort();
  return strategyTypes.length > 0
    ? ([...OPPORTUNITIES_QUERY_KEY, ...strategyTypes] as const)
    : OPPORTUNITIES_QUERY_KEY;
}

export async function fetchOpportunities(
  options?: FetchOpportunitiesOptions
): Promise<OpportunitiesResponse> {
  const url = new URL(`${API_URL}/opportunities`);
  for (const strategyType of options?.strategyTypes ?? []) {
    url.searchParams.append("strategy_type", strategyType);
  }
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GET /opportunities failed: ${res.status}`);
  }
  return res.json();
}
