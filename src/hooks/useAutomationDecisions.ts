import { useQuery } from "@tanstack/react-query";
import { POLL_INTERVAL_MS } from "../api/config";
import { fetchAutoEntryDecisions, fetchAutoExitDecisions } from "../api/automation";
import type { AutoEntryDecisionListResponse, AutoExitDecisionListResponse } from "../api/types";

export type DecisionKind = "entry" | "exit";
export const DECISION_LIMITS = [20, 50, 100] as const;
export type DecisionLimit = (typeof DECISION_LIMITS)[number];

/**
 * Decision logs of the entry or exit evaluator (issue #510). Only the selected kind is
 * fetched, with the chosen page size, so switching tabs never over-fetches.
 */
export function useAutomationDecisions(kind: DecisionKind, limit: DecisionLimit) {
  const query = useQuery<AutoEntryDecisionListResponse | AutoExitDecisionListResponse>({
    queryKey: ["automation-decisions", kind, limit],
    queryFn: () =>
      kind === "entry" ? fetchAutoEntryDecisions(limit) : fetchAutoExitDecisions(limit),
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
