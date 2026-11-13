import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  patchMePreferences,
  type MePreferencesResponse,
  type MePreferencesUpdateRequest,
} from "../api/me-preferences";
import { ME_PREFERENCES_QUERY_KEY } from "./useMePreferences";
import { ME_OPPORTUNITIES_QUERY_KEY, OPPORTUNITIES_QUERY_KEY } from "../api/opportunities";

export function useUpdateMePreferences() {
  const queryClient = useQueryClient();

  return useMutation<MePreferencesResponse, Error, MePreferencesUpdateRequest>({
    mutationFn: patchMePreferences,
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(ME_PREFERENCES_QUERY_KEY, data);
      const invalidations = [queryClient.invalidateQueries({ queryKey: ME_PREFERENCES_QUERY_KEY })];
      const affectsProfileSelection =
        Object.prototype.hasOwnProperty.call(variables, "preset") ||
        Object.prototype.hasOwnProperty.call(variables, "runbook_overrides");
      if (affectsProfileSelection) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: ME_OPPORTUNITIES_QUERY_KEY })
        );
      }
      await Promise.all(invalidations);
    },
  });
}
