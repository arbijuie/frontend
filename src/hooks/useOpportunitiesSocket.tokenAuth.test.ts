import { renderHook, act } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchWsAuthTicket, WsAuthTicketRequestError } from "../api/ws";
import { useOpportunitiesSocket } from "./useOpportunitiesSocket";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(),
}));

vi.mock("../api/ws", async () => {
  const actual = await vi.importActual<typeof import("../api/ws")>("../api/ws");
  return {
    ...actual,
    fetchWsAuthTicket: vi.fn(),
    getWsUrl: vi.fn(() => "ws://test/ws/opportunities"),
  };
});

vi.mock("../api/config", () => ({
  API_TOKEN: "secret-token",
}));

const mockedUseQueryClient = vi.mocked(useQueryClient);
const mockedFetchWsAuthTicket = vi.mocked(fetchWsAuthTicket);

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event?: { code: number }) => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.onclose?.({ code: 1000 });
  }
}

function latestSocket(): MockWebSocket {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1];
}

describe("useOpportunitiesSocket with token auth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);
    mockedUseQueryClient.mockReturnValue({ getQueryData: vi.fn(), setQueryData: vi.fn() } as never);
    mockedFetchWsAuthTicket.mockResolvedValue({
      ticket: "abc",
      expires_at: "2026-09-17T10:01:00Z",
      ttl_s: 60,
      last_reject_reason: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fetches a ticket and sends it as the first message", async () => {
    renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });
    expect(MockWebSocket.instances.length).toBeGreaterThan(0);
    expect(mockedFetchWsAuthTicket).toHaveBeenCalled();

    const socket = latestSocket();
    act(() => {
      socket.onopen?.();
    });

    expect(socket.sentMessages).toEqual([JSON.stringify({ type: "auth", ticket: "abc" })]);
  });

  it("surfaces Retry-After from 429 ticket responses and retries", async () => {
    mockedFetchWsAuthTicket.mockRejectedValueOnce(new WsAuthTicketRequestError(429, 2));

    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.transportState).toBe("reconnecting");
    expect(result.current.authStatus).toBe("rate-limited");
    expect(result.current.authRetryAfterSeconds).toBe(5);
    expect(result.current.authDetail).toBe(
      "Retry-After below safe minimum; applying minimum delay."
    );
    expect(result.current.authRetryAttempt).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(mockedFetchWsAuthTicket).toHaveBeenCalledTimes(2);
  });

  it("uses a safer fallback delay when Retry-After is missing", async () => {
    mockedFetchWsAuthTicket.mockRejectedValueOnce(new WsAuthTicketRequestError(429, null));

    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.authStatus).toBe("rate-limited");
    expect(result.current.authRetryAfterSeconds).toBe(5);
    expect(result.current.authDetail).toBe(
      "Retry-After missing or invalid; using safe default delay."
    );

    await act(async () => {
      vi.advanceTimersByTime(4999);
      await Promise.resolve();
    });
    expect(mockedFetchWsAuthTicket).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(mockedFetchWsAuthTicket).toHaveBeenCalledTimes(2);
  });

  it("applies a safe minimum when Retry-After is too small", async () => {
    mockedFetchWsAuthTicket.mockRejectedValueOnce(new WsAuthTicketRequestError(429, 0.5));

    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.authStatus).toBe("rate-limited");
    expect(result.current.authRetryAfterSeconds).toBe(5);
    expect(result.current.authDetail).toBe(
      "Retry-After below safe minimum; applying minimum delay."
    );
  });

  it("falls back after repeated 429 ticket responses", async () => {
    mockedFetchWsAuthTicket.mockRejectedValue(new WsAuthTicketRequestError(429, 1));

    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });

    for (let i = 0; i < 4; i++) {
      await act(async () => {
        vi.advanceTimersByTime(5000);
        await Promise.resolve();
      });
    }

    expect(result.current.transportState).toBe("polling-fallback");
    expect(result.current.authStatus).toBe("auth-failed");
  });

  it("clears stale auth diagnostics when live transport is re-enabled", async () => {
    mockedFetchWsAuthTicket.mockRejectedValueOnce(new WsAuthTicketRequestError(429, null));

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useOpportunitiesSocket({ enabled }),
      { initialProps: { enabled: true } }
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.authStatus).toBe("rate-limited");
    expect(result.current.authRetryAttempt).toBe(1);

    rerender({ enabled: false });
    expect(result.current.authStatus).toBe("ok");

    mockedFetchWsAuthTicket.mockResolvedValue({
      ticket: "fresh-after-toggle",
      expires_at: "2026-09-17T10:03:00Z",
      ttl_s: 60,
      last_reject_reason: null,
    });

    rerender({ enabled: true });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.authStatus).toBe("ok");
    expect(result.current.authRetryAttempt).toBe(0);
    expect(result.current.reconnectAttempt).toBe(0);
  });

  it("reissues a ticket when auth is rejected before first data frame", async () => {
    mockedFetchWsAuthTicket.mockResolvedValueOnce({
      ticket: "expired",
      expires_at: "2026-09-17T10:01:00Z",
      ttl_s: 60,
      last_reject_reason: null,
    });
    mockedFetchWsAuthTicket.mockResolvedValueOnce({
      ticket: "fresh",
      expires_at: "2026-09-17T10:02:00Z",
      ttl_s: 60,
      last_reject_reason: "reused",
    });

    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });
    expect(MockWebSocket.instances.length).toBeGreaterThan(0);

    act(() => {
      latestSocket().onopen?.();
      latestSocket().onclose?.({ code: 4401 });
    });

    expect(result.current.authStatus).toBe("ticket-rejected");

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(mockedFetchWsAuthTicket).toHaveBeenCalledTimes(2);
    expect(MockWebSocket.instances.length).toBeGreaterThan(1);
    expect(result.current.authDetail).toBe("WS auth ticket was rejected; requesting a new ticket.");
  });

  it("uses normal reconnect flow for non-unauthorized early close", async () => {
    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      latestSocket().onopen?.();
      latestSocket().onclose?.({ code: 1006 });
    });

    expect(result.current.authStatus).toBe("ok");
    expect(result.current.transportState).toBe("reconnecting");

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(mockedFetchWsAuthTicket).toHaveBeenCalledTimes(2);
  });

  it("treats 4401 as transport reconnect after first data frame", async () => {
    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      latestSocket().onopen?.();
      latestSocket().onmessage?.({
        data: JSON.stringify({
          count: 1,
          ready_count: 1,
          opportunities: [],
          updated_at: "2026-09-17T10:00:00Z",
        }),
      });
      latestSocket().onclose?.({ code: 4401 });
    });

    expect(result.current.authStatus).toBe("ok");
    expect(result.current.transportState).toBe("reconnecting");

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(mockedFetchWsAuthTicket).toHaveBeenCalledTimes(2);
  });
});
