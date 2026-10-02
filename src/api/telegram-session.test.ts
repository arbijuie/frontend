import {
  bootstrapTelegramSession,
  formatTelegramBootstrapErrorForDisplay,
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
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            session_token: "session-123",
            principal_id: "telegram:42",
            expires_at: "2026-10-02T00:00:00Z",
            ttl_s: 3600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const response = await bootstrapTelegramSession();

    expect(response.principal_id).toBe("telegram:42");
    expect(getTelegramSessionToken()).toBe("session-123");
  });

  it("returns 401 details for display mapping", () => {
    const error = new TelegramSessionBootstrapError(401, "failed", "init_data signature mismatch");

    expect(formatTelegramBootstrapErrorForDisplay(error)).toContain("Telegram authorization failed");
  });
});
