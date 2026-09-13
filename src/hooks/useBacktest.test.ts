import { renderHook } from "@testing-library/react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useBacktestSummary,
  useBacktestGate,
  useBacktestLocks,
  useBacktestLock,
  useRunBacktestReplay,
  useCreateBacktestLock,
} from "./useBacktest";
import {
  fetchBacktestSummary,
  fetchBacktestGate,
  runBacktestReplay,
  createBacktestLock,
} from "../api/backtest-endpoint";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock("../api/backtest-endpoint", () => ({
  fetchBacktestSummary: vi.fn(),
  fetchBacktestGate: vi.fn(),
  fetchBacktestLocks: vi.fn(),
  fetchBacktestLock: vi.fn(),
  runBacktestReplay: vi.fn(),
  createBacktestLock: vi.fn(),
}));

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);
const mockedUseQueryClient = vi.mocked(useQueryClient);

describe("useBacktestSummary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("queries backtest-summary and maps query state", () => {
    const refetch = vi.fn();
    mockedUseQuery.mockReturnValue({
      data: { total_snapshots: 0, symbols_covered: 0 },
      error: null,
      isLoading: true,
      isFetching: true,
      refetch,
    } as never);

    const { result } = renderHook(() => useBacktestSummary());

    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ["backtest-summary"],
      queryFn: fetchBacktestSummary,
    });
    expect(result.current.data).toEqual({ total_snapshots: 0, symbols_covered: 0 });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.fetching).toBe(true);
    expect(result.current.refetch).toBe(refetch);
  });

  it("returns Error message when query fails", () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      error: new Error("network down"),
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);

    const { result } = renderHook(() => useBacktestSummary());

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("network down");
  });
});

describe("useBacktestGate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("queries backtest-gate and maps query state", () => {
    const refetch = vi.fn();
    mockedUseQuery.mockReturnValue({
      data: { passed: true },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch,
    } as never);

    const { result } = renderHook(() => useBacktestGate());

    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ["backtest-gate"],
      queryFn: fetchBacktestGate,
    });
    expect(result.current.data).toEqual({ passed: true });
    expect(result.current.refetch).toBe(refetch);
  });

  it("returns Error message when query fails", () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      error: new Error("gate unreachable"),
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);

    const { result } = renderHook(() => useBacktestGate());

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("gate unreachable");
  });
});

describe("useBacktestLocks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("queries backtest-locks and maps query state", () => {
    mockedUseQuery.mockReturnValue({
      data: { count: 1, items: [] },
      error: null,
      isLoading: false,
    } as never);

    const { result } = renderHook(() => useBacktestLocks());

    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ["backtest-locks"],
      queryFn: expect.any(Function),
    });
    expect(result.current.data).toEqual({ count: 1, items: [] });
    expect(result.current.loading).toBe(false);
  });

  it("returns Error message when query fails", () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      error: new Error("locks unreachable"),
      isLoading: false,
    } as never);

    const { result } = renderHook(() => useBacktestLocks());

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("locks unreachable");
  });
});

describe("useBacktestLock", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("is disabled and uses a placeholder key when lockId is null", () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
    } as never);

    renderHook(() => useBacktestLock(null));

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["backtest-lock", "none"], enabled: false })
    );
  });

  it("is enabled and queries by lockId when provided", () => {
    mockedUseQuery.mockReturnValue({
      data: { lock_id: "abc" },
      error: null,
      isLoading: false,
    } as never);

    const { result } = renderHook(() => useBacktestLock("abc"));

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["backtest-lock", "abc"], enabled: true })
    );
    expect(result.current.data).toEqual({ lock_id: "abc" });
  });
});

describe("useRunBacktestReplay", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("wires up useMutation with runBacktestReplay", () => {
    mockedUseMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    renderHook(() => useRunBacktestReplay());

    expect(mockedUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({ mutationFn: runBacktestReplay })
    );
  });
});

describe("useCreateBacktestLock", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("wires up useMutation with createBacktestLock and invalidates locks/gate on success", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    mockedUseQueryClient.mockReturnValue({ invalidateQueries } as never);
    mockedUseMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);

    renderHook(() => useCreateBacktestLock());

    expect(mockedUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({ mutationFn: createBacktestLock })
    );

    const options = mockedUseMutation.mock.calls[0][0] as { onSuccess: () => Promise<void> };
    await options.onSuccess();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["backtest-locks"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["backtest-gate"] });
  });
});
