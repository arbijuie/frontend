import {
  bootstrapTelegramSession,
  formatTelegramBootstrapErrorForDisplay,
  hasTelegramWebAppContext,
  TelegramSessionBootstrapError,
} from "./telegram-session";
import { getTelegramSessionToken, setTelegramSessionToken } from "./config";

describe("telegram session bootstrap", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    delete (window as Window & { Telegram?: unknown }).Telegram;
    setTelegramSessionToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as Window & { Telegram?: unknown }).Telegram;
    setTelegramSessionToken(null);
  });

  it("rejects when Telegram initData is missing", async () => {
    (window as Window & { Telegram?: unknown }).Telegram = { WebApp: { initData: "" } };

    await expect(bootstrapTelegramSession()).rejects.toBeInstanceOf(TelegramSessionBootstrapError);
  });

  it("stores runtime session token after successful bootstrap", async () => {
    (window as Window & { Telegram?: unknown }).Telegram = {
      WebApp: { initData: "query_id=abc&hash=def" },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              session_token: "session-123",
              principal_id: "telegram:42",
              expires_at: "2026-10-02T00:00:00Z",
              ttl_s: 3600,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
      )
    );

    const response = await bootstrapTelegramSession();

    expect(response.principal_id).toBe("telegram:42");
    expect(getTelegramSessionToken()).toBe("session-123");
  });

  it("returns 401 details for display mapping", () => {
    const error = new TelegramSessionBootstrapError(401, "failed", "init_data signature mismatch");

    expect(formatTelegramBootstrapErrorForDisplay(error)).toContain(
      "Telegram authorization failed"
    );
  });

  it("rejects a 404 session answer without storing a session token", async () => {
    (window as Window & { Telegram?: unknown }).Telegram = {
      WebApp: { initData: "query_id=abc&hash=def" },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ detail: "Not Found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          })
      )
    );

    const failure = await bootstrapTelegramSession().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TelegramSessionBootstrapError);
    expect((failure as TelegramSessionBootstrapError).status).toBe(404);
    expect(getTelegramSessionToken()).toBeNull();
  });

  it.each([
    [400, "Telegram WebApp initData is missing", "Open this app from Telegram to authenticate."],
    [503, null, "Telegram authentication service is temporarily unavailable."],
    [429, null, "Unable to authenticate in Telegram mode (HTTP 429)."],
  ])("maps HTTP %i to the operator message", (status, detail, expected) => {
    const error = new TelegramSessionBootstrapError(status, "failed", detail);

    expect(formatTelegramBootstrapErrorForDisplay(error)).toBe(expected);
  });

  it("treats whitespace-only initData as no Telegram context", async () => {
    (window as Window & { Telegram?: unknown }).Telegram = { WebApp: { initData: "   " } };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(hasTelegramWebAppContext()).toBe(false);
    await expect(bootstrapTelegramSession()).rejects.toBeInstanceOf(TelegramSessionBootstrapError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains a 404 as a missing session route instead of a generic failure", () => {
    const error = new TelegramSessionBootstrapError(404, "failed", "Not Found");

    const text = formatTelegramBootstrapErrorForDisplay(error);

    expect(text).toContain("HTTP 404");
    expect(text).toContain("/auth/telegram/session");
  });
});
