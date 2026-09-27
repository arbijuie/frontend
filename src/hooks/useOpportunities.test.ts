import { renderHook } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { useOpportunities } from "./useOpportunities";
import { useOpportunitiesSocket } from "./useOpportunitiesSocket";
import { fetchOpportunities } from "../api/opportunities";
import { POLL_INTERVAL_MS } from "../api/config";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
}));

vi.mock("./useOpportunitiesSocket", () => ({
  useOpportunitiesSocket: vi.fn(),
}));

vi.mock("../api/opportunities", () => ({
  OPPORTUNITIES_QUERY_KEY: ["opportunities"],
  fetchOpportunities: vi.fn(),
  opportunitiesQueryKey: (options?: { strategyTypes?: string[] }) => {
    const values = [...(options?.strategyTypes ?? [])].sort();
    return values.length > 0 ? (["opportunities", ...values] as const) : (["opportunities"] as const);
  },
}));

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseOpportunitiesSocket = vi.mocked(useOpportunitiesSocket);
const mockedFetchOpportunities = vi.mocked(fetchOpportunities);

describe("useOpportunities", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseOpportunitiesSocket.mockReturnValue({
      transportState: "reconnecting",
      reconnectAttempt: 0,
      authRetryAttempt: 0,
      authStatus: "ok",
      authRetryAfterSeconds: null,
      authDetail: null,
      retryNow: vi.fn(),
    });
  });

  it("uses polling interval and maps query state when not connected via WS", () => {
    const refetch = vi.fn();
    mockedUseQuery.mockReturnValue({
      data: { count: 0, ready_count: 0, updated_at: null, opportunities: [] },
      error: null,
      isLoading: true,
      isFetching: true,
      refetch,
    } as never);

    const { result } = renderHook(() => useOpportunities());

    expect(mockedUseOpportunitiesSocket).toHaveBeenCalledWith({
      queryKey: ["opportunities"],
      enabled: true,
    });
    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ["opportunities"],
      queryFn: expect.any(Function),
      refetchInterval: POLL_INTERVAL_MS,
    });
    const queryFn = mockedUseQuery.mock.calls[0][0].queryFn as () => Promise<unknown>;
    void queryFn();
    expect(mockedFetchOpportunities).toHaveBeenCalledWith({ strategyTypes: undefined });
    expect(result.current.data).toEqual({
      count: 0,
      ready_count: 0,
      updated_at: null,
      opportunities: [],
    });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.fetching).toBe(true);
    expect(result.current.refetch).toBe(refetch);
  });

  it("disables polling when WS transport is connected", () => {
    mockedUseOpportunitiesSocket.mockReturnValue({
      transportState: "connected",
      reconnectAttempt: 0,
      authRetryAttempt: 0,
      authStatus: "ok",
      authRetryAfterSeconds: null,
      authDetail: null,
      retryNow: vi.fn(),
    });
    mockedUseQuery.mockReturnValue({
      data: null,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);

    renderHook(() => useOpportunities());

    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ["opportunities"],
      queryFn: expect.any(Function),
      refetchInterval: false,
    });
  });

  it("uses filtered query keys and polling policy for strategy-filtered views", () => {
    mockedUseQuery.mockReturnValue({
      data: null,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);

    renderHook(() => useOpportunities({ strategyTypes: ["cash_and_carry", "basis_convergence"] }));

    expect(mockedUseOpportunitiesSocket).toHaveBeenCalledWith({
      queryKey: ["opportunities"],
      enabled: false,
    });
    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ["opportunities", "basis_convergence", "cash_and_carry"],
      queryFn: expect.any(Function),
      refetchInterval: POLL_INTERVAL_MS,
    });
    const queryFn = mockedUseQuery.mock.calls[0][0].queryFn as () => Promise<unknown>;
    void queryFn();
    expect(mockedFetchOpportunities).toHaveBeenCalledWith({
      strategyTypes: ["cash_and_carry", "basis_convergence"],
    });
  });

  it("returns Error message when query fails", () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      error: new Error("network down"),
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);

    const { result } = renderHook(() => useOpportunities());

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("network down");
  });

  it("exposes transport state and retry from the socket hook", () => {
    const retryNow = vi.fn();
    mockedUseOpportunitiesSocket.mockReturnValue({
      transportState: "polling-fallback",
      reconnectAttempt: 3,
      authRetryAttempt: 2,
      authStatus: "auth-failed",
      authRetryAfterSeconds: null,
      authDetail: "WS auth failed repeatedly; using polling fallback.",
      retryNow,
    });
    mockedUseQuery.mockReturnValue({
      data: null,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);

    const { result } = renderHook(() => useOpportunities());

    expect(result.current.transportState).toBe("polling-fallback");
    expect(result.current.reconnectAttempt).toBe(3);
    expect(result.current.authRetryAttempt).toBe(2);
    expect(result.current.authStatus).toBe("auth-failed");
    expect(result.current.retryConnection).toBe(retryNow);
  });
});
