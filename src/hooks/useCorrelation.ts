import { useQuery } from "@tanstack/react-query";
import { POLL_INTERVAL_MS } from "../api/config";
import { fetchCorrelation } from "../api/correlation";

export function useCorrelation() {
  const query = useQuery({
    queryKey: ["correlation"],
    queryFn: fetchCorrelation,
    refetchInterval: POLL_INTERVAL_MS,
  });

  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : null,
    loading: query.isLoading,
    fetching: query.isFetching,
    refetch: query.refetch,
  };
}
