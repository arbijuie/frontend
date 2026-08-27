import { useQuery } from '@tanstack/react-query';
import { fetchStatus } from '../api/status';
import { POLL_INTERVAL_MS } from '../api/config';

export function useStatus() {
  const query = useQuery({
    queryKey: ['status'],
    queryFn: fetchStatus,
    refetchInterval: POLL_INTERVAL_MS,
  });

  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : null,
    loading: query.isLoading,
  };
}
