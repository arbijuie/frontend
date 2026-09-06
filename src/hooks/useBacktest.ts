import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchBacktestSummary,
  fetchBacktestGate,
  fetchBacktestLocks,
  fetchBacktestLock,
  runBacktestReplay,
  createBacktestLock,
} from "../api/backtest-endpoint";
import type { BacktestReplayRequest, BacktestReplayResponse, BacktestLock } from "../api/types";

const BACKTEST_SUMMARY_KEY = ["backtest-summary"];
const BACKTEST_GATE_KEY = ["backtest-gate"];
const BACKTEST_LOCKS_KEY = ["backtest-locks"];
const backtestLockKey = (lockId: string) => ["backtest-lock", lockId];

export function useBacktestSummary() {
  const query = useQuery({ queryKey: BACKTEST_SUMMARY_KEY, queryFn: fetchBacktestSummary });
  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : null,
    loading: query.isLoading,
    fetching: query.isFetching,
    refetch: query.refetch,
  };
}

export function useBacktestGate() {
  const query = useQuery({ queryKey: BACKTEST_GATE_KEY, queryFn: fetchBacktestGate });
  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : null,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useBacktestLocks() {
  const query = useQuery({ queryKey: BACKTEST_LOCKS_KEY, queryFn: () => fetchBacktestLocks() });
  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : null,
    loading: query.isLoading,
  };
}

export function useBacktestLock(lockId: string | null) {
  const query = useQuery({
    queryKey: lockId ? backtestLockKey(lockId) : ["backtest-lock", "none"],
    queryFn: () => fetchBacktestLock(lockId as string),
    enabled: lockId !== null,
  });
  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : null,
    loading: query.isLoading,
  };
}

export function useRunBacktestReplay() {
  return useMutation<BacktestReplayResponse, Error, BacktestReplayRequest>({
    mutationFn: runBacktestReplay,
  });
}

export function useCreateBacktestLock() {
  const queryClient = useQueryClient();
  return useMutation<BacktestLock, Error, BacktestReplayRequest>({
    mutationFn: createBacktestLock,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: BACKTEST_LOCKS_KEY }),
        queryClient.invalidateQueries({ queryKey: BACKTEST_GATE_KEY }),
      ]);
    },
  });
}
