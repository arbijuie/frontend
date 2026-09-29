import { renderHook } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { useOpportunities } from "./useOpportunities";
import { useOpportunitiesTransport } from "./useOpportunitiesTransport";
import { POLL_INTERVAL_MS } from "../api/config";
import { makeTransport } from "../test-utils/transport-fixture";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
}));

vi.mock("./useOpportunitiesTransport", () => ({
  useOpportunitiesTransport: vi.fn(),
}));

vi.mock("../api/opportunities", () => ({
  fetchOpportunities: vi.fn(),
  opportunitiesQueryKey: vi.fn(() => ["opportunities"]),
}));

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseTransport = vi.mocked(useOpportunitiesTransport);

function mockQuery(overrides: Record<string, unknown> = {}) {
  mockedUseQuery.mockReturnValue({
    data: null,
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  } as never);
}

describe("useOpportunities", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseTransport.mockReturnValue(makeTransport({ transportState: "reconnecting" }));
  });

  it("uses polling interval and maps query state when not connected via WS", () => {
    const refetch = vi.fn();
    mockQuery({
      data: { count: 0, ready_count: 0, updated_at: null, opportunities: [] },
      isLoading: true,
      isFetching: true,
      refetch,
    });

    const { result } = renderHook(() => useOpportunities());

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ refetchInterval: POLL_INTERVAL_MS })
    );
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
    mockedUseTransport.mockReturnValue(makeTransport({ transportState: "connected" }));
    mockQuery();

    renderHook(() => useOpportunities());

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ refetchInterval: false })
    );
  });

  it("keeps polling for filtered strategy views even when WS is connected", () => {
    mockedUseTransport.mockReturnValue(makeTransport({ transportState: "connected" }));
    mockQuery();

    renderHook(() => useOpportunities({ strategyTypes: ["funding_arbitrage"] }));

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ refetchInterval: POLL_INTERVAL_MS })
    );
  });

  it("returns Error message when query fails", () => {
    mockQuery({ data: undefined, error: new Error("network down") });

    const { result } = renderHook(() => useOpportunities());

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("network down");
  });

  it("exposes transport state, auth diagnostics, and retry from the transport context", () => {
    const retryNow = vi.fn();
    mockedUseTransport.mockReturnValue(
      makeTransport({
        transportState: "polling-fallback",
        reconnectAttempt: 3,
        authRetryAttempt: 2,
        authStatus: "ticket-rejected",
        authDetail: "ticket already used",
        retryNow,
      })
    );
    mockQuery();

    const { result } = renderHook(() => useOpportunities());

    expect(result.current.transportState).toBe("polling-fallback");
    expect(result.current.reconnectAttempt).toBe(3);
    expect(result.current.authRetryAttempt).toBe(2);
    expect(result.current.authStatus).toBe("ticket-rejected");
    expect(result.current.authDetail).toBe("ticket already used");
    expect(result.current.retryConnection).toBe(retryNow);
  });
});
