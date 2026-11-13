import { afterEach, describe, expect, it } from "vitest";
import {
  authHeaders,
  getTelegramSessionToken,
  hasRuntimeAuth,
  setTelegramSessionToken,
} from "./config";

afterEach(() => {
  setTelegramSessionToken(null);
});

describe("hasRuntimeAuth / authHeaders consistency", () => {
  it("agrees when only a telegram session is set", () => {
    setTelegramSessionToken("  sess  ");
    expect(getTelegramSessionToken()).toBe("sess");
    expect(hasRuntimeAuth()).toBe(true);
    expect(authHeaders()).toEqual({ "X-Arb-Telegram-Session": "sess" });
  });

  it("has no auth headers when session is unset", () => {
    expect(hasRuntimeAuth()).toBe(false);
    expect(authHeaders()).toEqual({});
  });
});
