import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const configState = vi.hoisted(() => ({
  sessionToken: null as string | null,
}));

vi.mock("./config", () => ({
  API_URL: "http://127.0.0.1:8000",
  WS_URL_OVERRIDE: undefined,
  authFetch: vi.fn(),
  getTelegramSessionToken: () => configState.sessionToken,
  hasRuntimeAuth: () => Boolean(configState.sessionToken),
}));

describe("buildWsAuthPayload", () => {
  beforeEach(() => {
    configState.sessionToken = null;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("includes ticket+session when a Telegram session exists", async () => {
    configState.sessionToken = "tg-session";
    const { buildWsAuthPayload } = await import("./ws");

    expect(buildWsAuthPayload("ticket-1")).toEqual({
      type: "auth",
      ticket: "ticket-1",
      session: "tg-session",
    });
  });

  it("sends ticket only when no Telegram session is set", async () => {
    const { buildWsAuthPayload } = await import("./ws");

    expect(buildWsAuthPayload("ticket-2")).toEqual({
      type: "auth",
      ticket: "ticket-2",
    });
  });
});
