import { renderHook } from "@testing-library/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { patchMePreferences } from "../api/me-preferences";
import { ME_OPPORTUNITIES_QUERY_KEY, OPPORTUNITIES_QUERY_KEY } from "../api/opportunities";
import { useUpdateMePreferences } from "./useUpdateMePreferences";
import { ME_PREFERENCES_QUERY_KEY } from "./useMePreferences";

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock("../api/me-preferences", () => ({
  patchMePreferences: vi.fn(),
}));

const mockedUseMutation = vi.mocked(useMutation);
const mockedUseQueryClient = vi.mocked(useQueryClient);

describe("useUpdateMePreferences", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("invalidates opportunities when profile fields are updated", async () => {
    const setQueryData = vi.fn();
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    mockedUseQueryClient.mockReturnValue({ setQueryData, invalidateQueries } as never);
    mockedUseMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    renderHook(() => useUpdateMePreferences());

    expect(mockedUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({ mutationFn: patchMePreferences })
    );

    const options = mockedUseMutation.mock.calls[0][0] as {
      onSuccess: (data: unknown, variables: unknown) => Promise<void>;
    };
    const responsePayload = { selected_preset: "balanced" };
    const requestPayload = { runbook_overrides: { min_score_bps: 9 } };
    await options.onSuccess(responsePayload, requestPayload);

    expect(setQueryData).toHaveBeenCalledWith(ME_PREFERENCES_QUERY_KEY, responsePayload);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ME_PREFERENCES_QUERY_KEY });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: OPPORTUNITIES_QUERY_KEY });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ME_OPPORTUNITIES_QUERY_KEY });
  });

  it("keeps opportunities caches when tutorial-only update is saved", async () => {
    const setQueryData = vi.fn();
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    mockedUseQueryClient.mockReturnValue({ setQueryData, invalidateQueries } as never);
    mockedUseMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    renderHook(() => useUpdateMePreferences());

    const options = mockedUseMutation.mock.calls[0][0] as {
      onSuccess: (data: unknown, variables: unknown) => Promise<void>;
    };
    await options.onSuccess({ selected_preset: null }, { tutorial: { welcome_completed: true } });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ME_PREFERENCES_QUERY_KEY });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: OPPORTUNITIES_QUERY_KEY });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ME_OPPORTUNITIES_QUERY_KEY });
  });
});
