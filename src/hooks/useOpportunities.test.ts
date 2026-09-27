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
  fetchOpportunities: vi.fn(),
}));

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseOpportunitiesSocket = vi.mocked(useOpportunitiesSocket);

describe("useOpportunities", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseOpportunitiesSocket.mockReturnValue({
      transportState: "reconnecting",
      reconnectAttempt: 0,
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

    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ["opportunities"],
      queryFn: fetchOpportunities,
      refetchInterval: POLL_INTERVAL_MS,
    });
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
      queryFn: fetchOpportunities,
      refetchInterval: false,
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
    expect(result.current.authStatus).toBe("auth-failed");
    expect(result.current.retryConnection).toBe(retryNow);
  });
});
