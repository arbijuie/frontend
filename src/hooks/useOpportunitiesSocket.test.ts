import { renderHook, act } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchWsAuthTicket } from "../api/ws";
import { useOpportunitiesSocket } from "./useOpportunitiesSocket";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(),
}));

vi.mock("../api/ws", () => ({
  fetchWsAuthTicket: vi.fn(),
  getWsUrl: vi.fn(() => "ws://test/ws/opportunities"),
  shouldUseWsTicketAuth: vi.fn(() => false),
  buildWsAuthPayload: vi.fn((ticket: string) => ({ type: "auth", ticket })),
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

const sampleFrame = {
  count: 1,
  ready_count: 1,
  opportunities: [],
  updated_at: "2026-09-17T10:00:00Z",
};

describe("useOpportunitiesSocket", () => {
  let getQueryData: ReturnType<typeof vi.fn>;
  let setQueryData: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);

    getQueryData = vi.fn();
    setQueryData = vi.fn();
    mockedUseQueryClient.mockReturnValue({ getQueryData, setQueryData } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("connects without requesting a ticket when no token is configured", async () => {
    renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedFetchWsAuthTicket).not.toHaveBeenCalled();
    expect(latestSocket()).toBeDefined();
  });

  it("does not connect when disabled", async () => {
    renderHook(() => useOpportunitiesSocket({ enabled: false, queryKey: ["opportunities", "filtered"] }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedFetchWsAuthTicket).not.toHaveBeenCalled();
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it("does not report connected until the first frame arrives", async () => {
    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      latestSocket().onopen?.();
    });

    expect(result.current.transportState).not.toBe("connected");
  });

  it("reports connected once a frame is received", async () => {
    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      latestSocket().onopen?.();
    });
    act(() => {
      latestSocket().onmessage?.({ data: JSON.stringify(sampleFrame) });
    });

    expect(result.current.transportState).toBe("connected");
  });

  it("writes incoming frames into the opportunities query cache", async () => {
    renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      latestSocket().onopen?.();
    });

    act(() => {
      latestSocket().onmessage?.({ data: JSON.stringify(sampleFrame) });
    });

    expect(setQueryData).toHaveBeenCalledWith(["opportunities"], sampleFrame);
  });

  it("writes incoming frames into a provided query key", async () => {
    renderHook(() => useOpportunitiesSocket({ queryKey: ["opportunities", "cash_and_carry"] }));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      latestSocket().onopen?.();
    });

    act(() => {
      latestSocket().onmessage?.({ data: JSON.stringify(sampleFrame) });
    });

    expect(setQueryData).toHaveBeenCalledWith(["opportunities", "cash_and_carry"], sampleFrame);
  });

  it("uses the latest query key after rerender", async () => {
    const { rerender } = renderHook(
      ({ queryKey }: { queryKey: readonly ("opportunities" | "funding_arbitrage" | "cash_and_carry")[] }) =>
        useOpportunitiesSocket({ queryKey }),
      {
        initialProps: {
          queryKey: ["opportunities", "funding_arbitrage"] as readonly (
            | "opportunities"
            | "funding_arbitrage"
            | "cash_and_carry"
          )[],
        },
      }
    );
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      latestSocket().onopen?.();
    });

    rerender({ queryKey: ["opportunities", "cash_and_carry"] as const });

    act(() => {
      latestSocket().onmessage?.({ data: JSON.stringify(sampleFrame) });
    });

    expect(setQueryData).toHaveBeenCalledWith(["opportunities", "cash_and_carry"], sampleFrame);
  });

  it("ignores a frame older than what is already cached", async () => {
    getQueryData.mockReturnValue({ updated_at: "2026-09-17T10:05:00Z" });
    renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      latestSocket().onopen?.();
    });

    act(() => {
      latestSocket().onmessage?.({ data: JSON.stringify(sampleFrame) });
    });

    expect(setQueryData).not.toHaveBeenCalled();
  });

  it("moves to polling-fallback after exhausting reconnect attempts", async () => {
    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });

    for (let i = 0; i < 10 && result.current.transportState !== "polling-fallback"; i++) {
      act(() => {
        latestSocket().close();
      });
      await act(async () => {
        vi.advanceTimersByTime(30000);
        await Promise.resolve();
      });
    }

    expect(result.current.transportState).toBe("polling-fallback");
  });

  it("closes the connection after no messages arrive within the stall timeout", async () => {
    renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });
    const socket = latestSocket();
    let closed = false;
    socket.close = () => {
      closed = true;
      socket.onclose?.({ code: 1000 });
    };

    act(() => {
      socket.onopen?.();
    });

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(closed).toBe(true);
  });

  it("retryNow resets the attempt count, closes the old socket, and reconnects immediately", async () => {
    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      latestSocket().close();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.reconnectAttempt).toBe(1);

    const socketCountBefore = MockWebSocket.instances.length;

    act(() => {
      result.current.retryNow();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.reconnectAttempt).toBe(0);
    expect(MockWebSocket.instances.length).toBe(socketCountBefore + 1);
  });

  it("stays in polling-fallback and does not create a socket when disabled", async () => {
    const { result } = renderHook(() => useOpportunitiesSocket({ enabled: false }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.transportState).toBe("polling-fallback");
    expect(MockWebSocket.instances.length).toBe(0);
  });

    it("records the time of the last received frame", async () => {
    vi.setSystemTime(new Date("2026-09-28T10:00:00Z"));
    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      latestSocket().onopen?.();
    });
    expect(result.current.lastMessageAtMs).toBeNull();

    act(() => {
      latestSocket().onmessage?.({ data: JSON.stringify(sampleFrame) });
    });

    expect(result.current.lastMessageAtMs).toBe(Date.parse("2026-09-28T10:00:00Z"));
  });

  it("records each transport state change once", async () => {
    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      latestSocket().onopen?.();
    });
    act(() => {
      latestSocket().onmessage?.({ data: JSON.stringify(sampleFrame) });
    });
    act(() => {
      latestSocket().onmessage?.({ data: JSON.stringify(sampleFrame) });
    });

    const states = result.current.transitions.map((transition) => transition.state);
    expect(states).toContain("connecting");
    expect(states.filter((state) => state === "connected")).toHaveLength(1);
  });
});
