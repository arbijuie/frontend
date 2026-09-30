import {
  formatMessageAge,
  operatorHint,
  transportHealthFromState,
  transportStateLabel,
} from "./transportHealth";

describe("transportHealthFromState", () => {
  it("maps transport states to operator-facing health levels", () => {
    expect(transportHealthFromState("connected")).toBe("connected");
    expect(transportHealthFromState("connecting")).toBe("reconnecting");
    expect(transportHealthFromState("reconnecting")).toBe("reconnecting");
    expect(transportHealthFromState("polling-fallback")).toBe("degraded");
  });
});

describe("transportStateLabel", () => {
  it("returns a readable label for every state", () => {
    expect(transportStateLabel("connected")).toBe("connected (live)");
    expect(transportStateLabel("connecting")).toBe("connecting");
    expect(transportStateLabel("reconnecting")).toBe("reconnecting (retrying WS)");
    expect(transportStateLabel("polling-fallback")).toBe("degraded (polling fallback)");
  });
});

describe("formatMessageAge", () => {
  const now = Date.parse("2026-09-28T10:00:10Z");

  it("handles a missing timestamp", () => {
    expect(formatMessageAge(null, now)).toBe("no message yet");
  });

  it("formats seconds", () => {
    expect(formatMessageAge(Date.parse("2026-09-28T10:00:05Z"), now)).toBe("5s ago");
  });

  it("formats minutes and seconds", () => {
    expect(formatMessageAge(Date.parse("2026-09-28T09:58:55Z"), now)).toBe("1m 15s ago");
  });

  it("never returns a negative age", () => {
    expect(formatMessageAge(now + 5000, now)).toBe("0s ago");
  });
});

describe("operatorHint", () => {
  it("returns nothing when connected", () => {
    expect(operatorHint("connected", 32)).toBeNull();
  });

  it("explains the polling interval when degraded", () => {
    expect(operatorHint("degraded", 32)).toContain("32s");
  });

  it("returns a hint while reconnecting", () => {
    expect(operatorHint("reconnecting", 32)).not.toBeNull();
  });
});
