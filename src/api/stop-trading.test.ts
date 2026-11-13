import { fetchStopTrading, postStopTradingAck, STOP_TRADING_ACK_PATH } from "./stop-trading";
import { setTelegramSessionToken } from "./config";
import { ApiRequestError } from "../lib/api-errors";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("stop-trading client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setTelegramSessionToken(null);
  });

  it("reads the canonical path with the operator session header", async () => {
    setTelegramSessionToken("session-123");
    const fetchMock = vi.fn(async () => jsonResponse({ state: "running" }));
    vi.stubGlobal("fetch", fetchMock);

    const answer = await fetchStopTrading();

    expect(answer.state).toBe("running");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith("/risk/stop-trading")).toBe(true);
    expect(new Headers(init.headers).get("X-Arb-Telegram-Session")).toBe("session-123");
  });

  it("posts the acknowledgment reason as JSON", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ state: "running" }));
    vi.stubGlobal("fetch", fetchMock);

    await postStopTradingAck({ reason: "margin topped up" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith(STOP_TRADING_ACK_PATH)).toBe(true);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual({ reason: "margin topped up" });
  });

  it("turns a refused acknowledgment into a runtime error with its code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          { detail: { code: "stop_trading_not_latched", message: "nothing to acknowledge" } },
          409
        )
      )
    );

    const failure = await postStopTradingAck({ reason: "margin topped up" }).catch(
      (error: unknown) => error
    );

    expect(failure).toBeInstanceOf(ApiRequestError);
    expect((failure as ApiRequestError).code).toBe("stop_trading_not_latched");
    expect((failure as ApiRequestError).kind).toBe("runtime");
  });

  it("rejects a failed read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ detail: "Not authenticated" }, 401))
    );

    await expect(fetchStopTrading()).rejects.toBeInstanceOf(ApiRequestError);
  });
});
