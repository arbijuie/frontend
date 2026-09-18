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
}));

vi.mock("../api/config", () => ({
  API_TOKEN: undefined,
}));

const mockedUseQueryClient = vi.mocked(useQueryClient);
const mockedFetchWsAuthTicket = vi.mocked(fetchWsAuthTicket);

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.onclose?.();
  }
}

function latestSocket(): MockWebSocket {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1];
}

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

  it("becomes connected after the socket opens", async () => {
    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      latestSocket().onopen?.();
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

    const frame = {
      count: 1,
      ready_count: 1,
      opportunities: [],
      updated_at: "2026-09-17T10:00:00Z",
    };
    act(() => {
      latestSocket().onmessage?.({ data: JSON.stringify(frame) });
    });

    expect(setQueryData).toHaveBeenCalledWith(["opportunities"], frame);
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

    const staleFrame = {
      count: 1,
      ready_count: 1,
      opportunities: [],
      updated_at: "2026-09-17T10:00:00Z",
    };
    act(() => {
      latestSocket().onmessage?.({ data: JSON.stringify(staleFrame) });
    });

    expect(setQueryData).not.toHaveBeenCalled();
  });

  it("moves to polling-fallback after exhausting reconnect attempts", async () => {
    const { result } = renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
    });

    for (let i = 0; i < 5; i++) {
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
      socket.onclose?.();
    };

    act(() => {
      socket.onopen?.();
    });

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(closed).toBe(true);
  });

  it("retryNow resets the attempt count and reconnects immediately", async () => {
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

    act(() => {
      result.current.retryNow();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.reconnectAttempt).toBe(0);
  });
});
