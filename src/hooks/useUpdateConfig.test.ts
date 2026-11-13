import { renderHook } from "@testing-library/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { patchConfig } from "../api/config-endpoint";
import { ME_OPPORTUNITIES_QUERY_KEY } from "../api/opportunities";
import { useUpdateConfig } from "./useUpdateConfig";
import { ME_PREFERENCES_QUERY_KEY } from "./useMePreferences";

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock("../api/config-endpoint", () => ({
  patchConfig: vi.fn(),
}));

const mockedUseMutation = vi.mocked(useMutation);
const mockedUseQueryClient = vi.mocked(useQueryClient);

describe("useUpdateConfig", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates config cache and invalidates dependent queries", async () => {
    const setQueryData = vi.fn();
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    mockedUseQueryClient.mockReturnValue({ setQueryData, invalidateQueries } as never);
    mockedUseMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    renderHook(() => useUpdateConfig());

    expect(mockedUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({ mutationFn: patchConfig })
    );

    const options = mockedUseMutation.mock.calls[0][0] as {
      onSuccess: (data: unknown) => Promise<void>;
    };
    const configPayload = { min_score_bps: 9 };
    await options.onSuccess(configPayload);

    expect(setQueryData).toHaveBeenCalledWith(["config"], configPayload);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["config"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["status"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["opportunities"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ME_OPPORTUNITIES_QUERY_KEY });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ME_PREFERENCES_QUERY_KEY });
  });
});
