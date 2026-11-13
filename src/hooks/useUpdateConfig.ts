import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchConfig } from "../api/config-endpoint";
import type { ConfigUpdateRequest, ConfigResponse } from "../api/types";
import { ME_OPPORTUNITIES_QUERY_KEY } from "../api/opportunities";
import { ME_PREFERENCES_QUERY_KEY } from "./useMePreferences";

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
        queryClient.invalidateQueries({ queryKey: ME_OPPORTUNITIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ME_PREFERENCES_QUERY_KEY }),
      ]);
    },
  });
}
