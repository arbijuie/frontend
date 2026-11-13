/** Tabs of the Backtest page; the active key lives in `?tab=` (mirrors Operations). */
export const BACKTEST_TABS = [
  { key: "summary", label: "Summary" },
  { key: "replay", label: "Replay" },
  { key: "gate", label: "Gate" },
  { key: "locks", label: "Locks" },
  { key: "lock-detail", label: "Detail" },
  { key: "history", label: "History" },
  { key: "survival", label: "Survival" },
] as const;

export type BacktestTab = (typeof BACKTEST_TABS)[number]["key"];
export const DEFAULT_BACKTEST_TAB: BacktestTab = "summary";

export function isBacktestTab(value: string | null): value is BacktestTab {
  return BACKTEST_TABS.some((tab) => tab.key === value);
}
