import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { POLL_INTERVAL_MS } from "../api/config";
import { fetchStopTrading, postStopTradingAck } from "../api/stop-trading";
import type { StopTradingAckRequest, StopTradingResponse } from "../api/types";

export const STOP_TRADING_KEY = ["stop-trading"];

export function useStopTrading() {
  const query = useQuery<StopTradingResponse>({
    queryKey: STOP_TRADING_KEY,
    queryFn: fetchStopTrading,
    refetchInterval: POLL_INTERVAL_MS,
  });

  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error : null,
    loading: query.isLoading,
    fetching: query.isFetching,
    refetch: query.refetch,
  };
}

/** Sends the acknowledgment and shows the answered latch state without a page reload. */
export function useStopTradingAck() {
  const queryClient = useQueryClient();

  return useMutation<StopTradingResponse, Error, StopTradingAckRequest>({
    mutationFn: postStopTradingAck,
    onSuccess: async (data) => {
      queryClient.setQueryData(STOP_TRADING_KEY, data);
      // A release reopens entries, so every surface that shows the entry posture refreshes.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["status"] }),
        queryClient.invalidateQueries({ queryKey: ["execution-preflight"] }),
        queryClient.invalidateQueries({ queryKey: ["automation"] }),
      ]);
    },
  });
}
