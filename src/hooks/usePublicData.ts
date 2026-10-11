import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { POLL_INTERVAL_MS } from "../api/config";
import {
  PublicApiError,
  fetchHealthz,
  fetchPublicCorrelation,
  fetchPublicJournal,
  fetchPublicOpportunities,
  fetchPublicStatus,
  isFinalPublicError,
} from "../api/public";
import type { PublicOpportunitiesResponse, PublicStatusResponse } from "../api/types";

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isFinalPublicError(error)) return false;
  return failureCount < 2;
}

/**
 * Polling period in ms, `false` to stop, or a function of the latest data and error that is
 * re-evaluated after every fetch (for example: poll until a first result shows up).
 */
export type PublicRefetchInterval<T> =
  number | false | ((data: T | undefined, error: unknown) => number | false);

interface PublicQueryOptions<T> {
  refetchIntervalMs?: PublicRefetchInterval<T>;
  enabled?: boolean;
}

function refetchInterval<T>(option: PublicRefetchInterval<T> | undefined) {
  if (typeof option !== "function") return option ?? POLL_INTERVAL_MS;
  return (query: { state: { data: T | undefined; error: unknown } }) =>
    option(query.state.data, query.state.error);
}

function toResult<T>(query: UseQueryResult<T, unknown>) {
  const error =
    query.error instanceof PublicApiError
      ? query.error
      : query.error
        ? new PublicApiError("", null)
        : null;
  return {
    data: query.data ?? null,
    error,
    loading: query.isLoading,
    fetching: query.isFetching,
    refetch: query.refetch,
    fetchedAt: query.dataUpdatedAt,
    /** When the current error arrived (ms epoch); used to count down a Retry-After wait. */
    errorAt: query.errorUpdatedAt,
  };
}

export function usePublicStatus(options: PublicQueryOptions<PublicStatusResponse> = {}) {
  return toResult(
    useQuery({
      queryKey: ["public", "status"],
      queryFn: fetchPublicStatus,
      refetchInterval: refetchInterval(options.refetchIntervalMs),
      enabled: options.enabled ?? true,
      retry: shouldRetry,
    })
  );
}

export function usePublicOpportunities(
  options: PublicQueryOptions<PublicOpportunitiesResponse> = {}
) {
  return toResult(
    useQuery({
      queryKey: ["public", "opportunities"],
      queryFn: fetchPublicOpportunities,
      refetchInterval: refetchInterval(options.refetchIntervalMs),
      enabled: options.enabled ?? true,
      retry: shouldRetry,
    })
  );
}

export function usePublicCorrelation() {
  return toResult(
    useQuery({
      queryKey: ["public", "correlation"],
      queryFn: fetchPublicCorrelation,
      refetchInterval: POLL_INTERVAL_MS,
      retry: shouldRetry,
    })
  );
}

export function usePublicJournal(days: number) {
  return toResult(
    useQuery({
      queryKey: ["public", "journal", days],
      queryFn: () => fetchPublicJournal(days),
      // Journal aggregates are cached for a minute server-side; poll slower than live data.
      refetchInterval: POLL_INTERVAL_MS * 4,
      retry: shouldRetry,
    })
  );
}

export function useHealthz(options: { enabled?: boolean } = {}) {
  return toResult(
    useQuery({
      queryKey: ["public", "healthz"],
      queryFn: fetchHealthz,
      enabled: options.enabled ?? true,
      retry: shouldRetry,
    })
  );
}
