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
  API_TOKEN: "secret-token",
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

describe("useOpportunitiesSocket with token auth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);
    mockedUseQueryClient.mockReturnValue({ getQueryData: vi.fn(), setQueryData: vi.fn() } as never);
    mockedFetchWsAuthTicket.mockResolvedValue({
      ticket: "abc",
      expires_at: "2026-09-17T10:01:00Z",
      ttl_s: 60,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches a ticket and sends it as the first message", async () => {
    renderHook(() => useOpportunitiesSocket());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedFetchWsAuthTicket).toHaveBeenCalled();

    const socket = latestSocket();
    act(() => {
      socket.onopen?.();
    });

    expect(socket.sentMessages).toEqual([JSON.stringify({ type: "auth", ticket: "abc" })]);
  });
});