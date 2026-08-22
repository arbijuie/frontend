import { useQuery } from '@tanstack/react-query';
import { fetchOpportunities } from '../api/opportunities';
import { POLL_INTERVAL_MS } from '../api/config';

export function useOpportunities() {
  const query = useQuery({
    queryKey: ['opportunities'],
    queryFn: fetchOpportunities,
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
