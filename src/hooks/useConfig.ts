import { useQuery } from "@tanstack/react-query";
import { fetchConfig } from "../api/config-endpoint";

export function useConfig() {
  const query = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
    staleTime: Infinity,
  });

  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : null,
    loading: query.isLoading,
  };
}
