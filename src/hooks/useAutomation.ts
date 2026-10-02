import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { POLL_INTERVAL_MS } from "../api/config";
import { fetchAutomation, postAutomationControl } from "../api/automation";
import type { AutomationControlRequest, AutomationOverviewResponse } from "../api/types";

export function useAutomation() {
  const query = useQuery({
    queryKey: ["automation"],
    queryFn: fetchAutomation,
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

export function useAutomationControl() {
  const queryClient = useQueryClient();

  return useMutation<AutomationOverviewResponse, Error, AutomationControlRequest>({
    mutationFn: postAutomationControl,
    onSuccess: async (data) => {
      queryClient.setQueryData(["automation"], data);
      await queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });
}
