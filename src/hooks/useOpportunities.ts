import { useQuery } from "@tanstack/react-query";
import { fetchOpportunities } from "../api/opportunities";
import { POLL_INTERVAL_MS } from "../api/config";
import { useOpportunitiesSocket } from "./useOpportunitiesSocket";

export function useOpportunities() {
  const { transportState, reconnectAttempt, retryNow } = useOpportunitiesSocket();
  const isLive = transportState === "connected";

  const query = useQuery({
    queryKey: ["opportunities"],
    queryFn: fetchOpportunities,
    refetchInterval: isLive ? false : POLL_INTERVAL_MS,
  });

  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : null,
    loading: query.isLoading,
    fetching: query.isFetching,
    refetch: query.refetch,
    transportState,
    reconnectAttempt,
    retryConnection: retryNow,
  };
}
