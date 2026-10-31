import { autoSummary } from "./autoSummary";

const posture = { exec_enabled: true, exec_dry_run: true } as never;
const mode = (state: string, extra = {}) => ({ kind: "entry", state, ...extra }) as never;

describe("autoSummary", () => {
  it("says off when execution is disabled, even if entry looks armed", () => {
    const s = autoSummary({ entry: mode("armed"), posture: { exec_enabled: false } as never });
    expect(s.title).toBe("Auto-trading is off");
  });
  it("says off when auto-entry is disabled", () => {
    expect(autoSummary({ entry: mode("disabled"), posture }).title).toBe("Auto-trading is off");
  });
  it("names who paused it and why", () => {
    const s = autoSummary({
      entry: mode("paused", { paused_by: "ruslan", pause_reason: "news" }),
      posture,
    });
    expect(s.text).toContain('Paused by ruslan: "news"');
  });
  it("is red when safety checks block it", () => {
    expect(autoSummary({ entry: mode("blocked"), posture }).level).toBe("danger");
  });
  it("tells practice mode from real money", () => {
    expect(autoSummary({ entry: mode("armed"), posture }).text).toContain("no real money");
    expect(
      autoSummary({
        entry: mode("armed"),
        posture: { exec_enabled: true, exec_dry_run: false } as never,
      }).text
    ).toContain("Real money mode");
  });
});
