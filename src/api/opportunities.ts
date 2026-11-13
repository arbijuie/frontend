import { API_URL, authFetch } from "./config";
import type {
  OpportunitiesResponse,
  OpportunityStrategyType as ApiOpportunityStrategyType,
} from "./types";

export type OpportunityStrategyType = ApiOpportunityStrategyType;

export const OPPORTUNITY_STRATEGY_TYPES = [
  "funding_arbitrage",
  "basis_convergence",
  "cash_and_carry",
] as const;

export const OPPORTUNITY_STRATEGY_LABEL: Record<OpportunityStrategyType, string> = {
  funding_arbitrage: "Funding arbitrage",
  basis_convergence: "Basis convergence",
  cash_and_carry: "Cash and carry",
};

export type OpportunitiesFilterOptions = {
  strategyTypes?: OpportunityStrategyType[];
  personalized?: boolean;
  profileKey?: string;
};

export const OPPORTUNITIES_QUERY_KEY = ["opportunities"] as const;
export const ME_OPPORTUNITIES_QUERY_KEY = ["me-opportunities"] as const;

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
):
  | readonly ["opportunities"]
  | readonly ["opportunities", ...OpportunityStrategyType[]]
  | readonly ["me-opportunities", string]
  | readonly ["me-opportunities", string, ...OpportunityStrategyType[]] {
  const normalized = normalizeStrategyTypes(options?.strategyTypes);
  if (options?.personalized) {
    const profileKey = options.profileKey ?? "default";
    return normalized.length > 0
      ? ([...ME_OPPORTUNITIES_QUERY_KEY, profileKey, ...normalized] as const)
      : ([...ME_OPPORTUNITIES_QUERY_KEY, profileKey] as const);
  }
  return normalized.length > 0
    ? ([...OPPORTUNITIES_QUERY_KEY, ...normalized] as const)
    : OPPORTUNITIES_QUERY_KEY;
}

export async function fetchOpportunities(
  options?: OpportunitiesFilterOptions
): Promise<OpportunitiesResponse> {
  const normalized = normalizeStrategyTypes(options?.strategyTypes);
  const endpoint = options?.personalized ? "/me/opportunities" : "/opportunities";
  const url = new URL(`${API_URL}${endpoint}`);
  for (const strategyType of normalized) {
    url.searchParams.append("strategy_type", strategyType);
  }
  const res = await authFetch(url.toString());
  if (!res.ok) {
    throw new Error(`GET /opportunities failed: ${res.status}`);
  }
  return res.json();
}
