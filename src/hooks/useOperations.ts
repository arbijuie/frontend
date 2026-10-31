import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { POLL_INTERVAL_MS } from "../api/config";
import { fetchExecutionAttempts, postExecutionClose, postExecutionOpen } from "../api/execution";
import {
  fetchDailyPnl,
  fetchParityArtifacts,
  fetchParityReport,
  fetchPositions,
  fetchRiskGuardrails,
  fetchSnapshotContinuity,
} from "../api/operations";
import type {
  DailyPnlResponse,
  ExecutionAttemptItem,
  ExecutionAttemptListResponse,
  ExecutionCloseRequest,
  ExecutionOpenRequest,
  MigrationParityArtifactListResponse,
  MigrationParityReportResponse,
  PositionsResponse,
  RiskGuardrailsResponse,
  SnapshotContinuityResponse,
} from "../api/types";

export const EXECUTION_ATTEMPTS_KEY = ["execution-attempts"];
export const POSITIONS_KEY = ["positions"];

interface QueryView<T> {
  data: T | null;
  error: string | null;
  errorObject: Error | null;
  loading: boolean;
  fetching: boolean;
  refetch: () => Promise<unknown>;
}

function view<T>(query: {
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
}): QueryView<T> {
  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : null,
    errorObject: query.error instanceof Error ? query.error : null,
    loading: query.isLoading,
    fetching: query.isFetching,
    refetch: query.refetch,
  };
}

export function useExecutionAttempts(limit = 50): QueryView<ExecutionAttemptListResponse> {
  return view(
    useQuery<ExecutionAttemptListResponse>({
      queryKey: [...EXECUTION_ATTEMPTS_KEY, limit],
      queryFn: () => fetchExecutionAttempts(limit),
      refetchInterval: POLL_INTERVAL_MS,
    })
  );
}

function useExecutionMutation<TRequest>(
  mutationFn: (payload: TRequest) => Promise<ExecutionAttemptItem>
) {
  const queryClient = useQueryClient();
  return useMutation<ExecutionAttemptItem, Error, TRequest>({
    mutationFn,
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: EXECUTION_ATTEMPTS_KEY }),
        queryClient.invalidateQueries({ queryKey: POSITIONS_KEY }),
        queryClient.invalidateQueries({ queryKey: ["execution-preflight"] }),
        queryClient.invalidateQueries({ queryKey: ["status"] }),
      ]);
    },
  });
}

export function useExecutionOpen() {
  return useExecutionMutation<ExecutionOpenRequest>(postExecutionOpen);
}

export function useExecutionClose() {
  return useExecutionMutation<ExecutionCloseRequest>(postExecutionClose);
}

export function usePositions(): QueryView<PositionsResponse> {
  return view(
    useQuery<PositionsResponse>({
      queryKey: POSITIONS_KEY,
      queryFn: fetchPositions,
      refetchInterval: POLL_INTERVAL_MS,
    })
  );
}

export function useDailyPnl(days = 7): QueryView<DailyPnlResponse> {
  return view(
    useQuery<DailyPnlResponse>({
      queryKey: ["positions-pnl-daily", days],
      queryFn: () => fetchDailyPnl(days),
      refetchInterval: POLL_INTERVAL_MS,
    })
  );
}

export function useRiskGuardrails(): QueryView<RiskGuardrailsResponse> {
  return view(
    useQuery<RiskGuardrailsResponse>({
      queryKey: ["risk-guardrails"],
      queryFn: fetchRiskGuardrails,
      refetchInterval: POLL_INTERVAL_MS,
    })
  );
}

export function useParityReport(windowS = 3600): QueryView<MigrationParityReportResponse> {
  return view(
    useQuery<MigrationParityReportResponse>({
      queryKey: ["migration-parity-report", windowS],
      queryFn: () => fetchParityReport(windowS),
    })
  );
}

export function useParityArtifacts(limit = 50): QueryView<MigrationParityArtifactListResponse> {
  return view(
    useQuery<MigrationParityArtifactListResponse>({
      queryKey: ["migration-parity-artifacts", limit],
      queryFn: () => fetchParityArtifacts(limit),
    })
  );
}

export function useSnapshotContinuity(): QueryView<SnapshotContinuityResponse> {
  return view(
    useQuery<SnapshotContinuityResponse>({
      queryKey: ["snapshot-continuity"],
      queryFn: fetchSnapshotContinuity,
      refetchInterval: POLL_INTERVAL_MS,
    })
  );
}
