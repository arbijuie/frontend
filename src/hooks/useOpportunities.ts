import { useQuery } from "@tanstack/react-query";
import {
  fetchOpportunities,
  OPPORTUNITIES_QUERY_KEY,
  opportunitiesQueryKey,
  type OpportunityStrategyType,
} from "../api/opportunities";
import { POLL_INTERVAL_MS } from "../api/config";
import { useOpportunitiesSocket } from "./useOpportunitiesSocket";

type UseOpportunitiesOptions = {
  strategyTypes?: OpportunityStrategyType[];
};

export function useOpportunities(options?: UseOpportunitiesOptions) {
  const strategyTypes = options?.strategyTypes;
  const isFiltered = !!strategyTypes && strategyTypes.length > 0;
  const { transportState, reconnectAttempt, authStatus, authRetryAfterSeconds, authDetail, retryNow } =
    useOpportunitiesSocket({
      queryKey: OPPORTUNITIES_QUERY_KEY,
      enabled: !isFiltered,
    });
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
    authStatus,
    authRetryAfterSeconds,
    authDetail,
    retryConnection: retryNow,
  };
}
