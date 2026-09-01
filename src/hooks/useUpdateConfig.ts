import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchConfig } from "../api/config-endpoint";
import type { ConfigUpdateRequest, ConfigResponse } from "../api/types";

export function useUpdateConfig() {
  const queryClient = useQueryClient();

  return useMutation<ConfigResponse, Error, ConfigUpdateRequest>({
    mutationFn: patchConfig,
    onSuccess: async (data) => {
      queryClient.setQueryData(["config"], data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["config"] }),
        queryClient.invalidateQueries({ queryKey: ["status"] }),
        queryClient.invalidateQueries({ queryKey: ["opportunities"] }),
      ]);
    },
  });
}
