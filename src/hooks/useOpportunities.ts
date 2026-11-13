import { useQuery } from "@tanstack/react-query";
import {
  fetchOpportunities,
  opportunitiesQueryKey,
  type OpportunityStrategyType,
} from "../api/opportunities";
import { POLL_INTERVAL_MS } from "../api/config";
import { useOpportunitiesTransport } from "./useOpportunitiesTransport";
import { useMePreferences } from "./useMePreferences";

type UseOpportunitiesOptions = {
  strategyTypes?: OpportunityStrategyType[];
};

function profileIdentityKey(
  selectedPreset: string | null,
  runbookOverrides: Record<string, number | boolean | string>
): string {
  const normalizedOverrides = Object.entries(runbookOverrides)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([field, value]) => [field, value] as const);
  return JSON.stringify({ preset: selectedPreset, overrides: normalizedOverrides });
}

export function useOpportunities(options?: UseOpportunitiesOptions) {
  const strategyTypes = options?.strategyTypes;
  const isFiltered = !!strategyTypes && strategyTypes.length > 0;
  const {
    transportState,
    reconnectAttempt,
    authRetryAttempt,
    authStatus,
    authRetryAfterSeconds,
    authDetail,
    transportDetail,
    fallbackReason,
    retryNow,
  } = useOpportunitiesTransport();
  const mePreferences = useMePreferences();
  const isLive = transportState === "connected";
  const personalized =
    !!mePreferences.data &&
    (mePreferences.data.selected_preset !== null ||
      Object.keys(mePreferences.data.runbook_overrides).length > 0);
  const personalizedProfileKey =
    personalized && mePreferences.data
      ? profileIdentityKey(mePreferences.data.selected_preset, mePreferences.data.runbook_overrides)
      : undefined;
  const preferencesResolved = !mePreferences.loading;

  const query = useQuery({
    enabled: preferencesResolved,
    queryKey: opportunitiesQueryKey({
      strategyTypes,
      personalized,
      profileKey: personalizedProfileKey,
    }),
    queryFn: () => fetchOpportunities({ strategyTypes, personalized }),
    // Filtered strategy views rely on HTTP polling to avoid cache mixing with WS unfiltered frames.
    refetchInterval: isLive && !isFiltered && !personalized ? false : POLL_INTERVAL_MS,
  });

  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : null,
    loading: query.isLoading,
    fetching: query.isFetching,
    refetch: query.refetch,
    transportState,
    reconnectAttempt,
    authRetryAttempt,
    authStatus,
    authRetryAfterSeconds,
    authDetail,
    transportDetail,
    fallbackReason,
    retryConnection: retryNow,
    personalized,
  };
}
