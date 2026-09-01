import { useQuery } from "@tanstack/react-query";
import { fetchConfig } from "../api/config-endpoint";

interface UseConfigOptions {
  staleTime?: number;
  refetchInterval?: number;
}

export function useConfig(options: UseConfigOptions = {}) {
  const query = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
    staleTime: options.staleTime ?? Infinity,
    refetchInterval: options.refetchInterval,
  });

  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : null,
    loading: query.isLoading,
    fetching: query.isFetching,
    refetch: query.refetch,
  };
}
