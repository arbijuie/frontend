import { describe, expect, it } from "vitest";
import { DEFAULT_BACKTEST_TAB, isBacktestTab } from "./backtestTabs";

describe("backtestTabs", () => {
  it("recognizes known tab keys", () => {
    expect(isBacktestTab("replay")).toBe(true);
    expect(isBacktestTab("nope")).toBe(false);
    expect(isBacktestTab(null)).toBe(false);
    expect(DEFAULT_BACKTEST_TAB).toBe("summary");
  });
});
