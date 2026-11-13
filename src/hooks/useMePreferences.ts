import { useQuery } from "@tanstack/react-query";
import { fetchMePreferences, type MePreferencesResponse } from "../api/me-preferences";

export const ME_PREFERENCES_QUERY_KEY = ["me-preferences"] as const;

interface UseMePreferencesOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useMePreferences(options: UseMePreferencesOptions = {}) {
  const query = useQuery<MePreferencesResponse, Error>({
    queryKey: ME_PREFERENCES_QUERY_KEY,
    queryFn: fetchMePreferences,
    enabled: options.enabled ?? true,
    staleTime: options.staleTime ?? 30_000,
    retry: false,
  });

  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : null,
    loading: query.isLoading,
    fetching: query.isFetching,
    refetch: query.refetch,
  };
}
