import { useQuery } from "@tanstack/react-query";
import {
  fetchOpportunities,
  opportunitiesQueryKey,
  type OpportunityStrategyType,
} from "../api/opportunities";
import { POLL_INTERVAL_MS } from "../api/config";
import { useOpportunitiesTransport } from "./useOpportunitiesTransport";

type UseOpportunitiesOptions = {
  strategyTypes?: OpportunityStrategyType[];
};

export function useOpportunities(options?: UseOpportunitiesOptions) {
  const strategyTypes = options?.strategyTypes;
  const isFiltered = !!strategyTypes && strategyTypes.length > 0;
  const {
    transportState,
    reconnectAttempt,
    authRetryAttempt,
    authStatus,
    authRetryAfterSeconds,
    authDetail,
    retryNow,
  } = useOpportunitiesTransport();
  const isLive = transportState === "connected";

  const query = useQuery({
    queryKey: opportunitiesQueryKey({ strategyTypes }),
    queryFn: () => fetchOpportunities({ strategyTypes }),
    // Filtered strategy views rely on HTTP polling to avoid cache mixing with WS unfiltered frames.
    refetchInterval: isLive && !isFiltered ? false : POLL_INTERVAL_MS,
  });

  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : null,
    loading: query.isLoading,
    fetching: query.isFetching,
    refetch: query.refetch,
    transportState,
    reconnectAttempt,
    authRetryAttempt,
    authStatus,
    authRetryAfterSeconds,
    authDetail,
    retryConnection: retryNow,
  };
}
