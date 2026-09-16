import { useQuery } from "@tanstack/react-query";
import { POLL_INTERVAL_MS } from "../api/config";
import { fetchExecutionPreflight } from "../api/execution";

export function useExecutionPreflight() {
  const query = useQuery({
    queryKey: ["execution-preflight"],
    queryFn: fetchExecutionPreflight,
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
