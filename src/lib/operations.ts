import type { SnapshotContinuityResponse } from "../api/types";
import { formatUptime } from "./format";

/** Tabs of the Operations page (issues #507 to #513); the active key lives in `?tab=`. */
export const OPERATIONS_TABS = [
  { key: "actions", label: "Actions" },
  { key: "positions", label: "Positions" },
  { key: "guardrails", label: "Guardrails" },
  { key: "continuity", label: "Continuity" },
] as const;

export type OperationsTab = (typeof OPERATIONS_TABS)[number]["key"];
export const DEFAULT_OPERATIONS_TAB: OperationsTab = "actions";

export function isOperationsTab(value: string | null): value is OperationsTab {
  return OPERATIONS_TABS.some((tab) => tab.key === value);
}

export function formatUsd(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function formatSeconds(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? formatUptime(value) : "-";
}

export function formatProbability(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(0)}%` : "-";
}

/** What an operator does about each guardrail decision (issue #511). */
export const GUARDRAIL_NEXT_STEP: Record<string, string> = {
  margin:
    "Free margin is low on the venue: top up collateral or reduce exposure. Critical closes positions.",
  adl: "Auto-deleverage risk on the venue: reduce the position or add margin before the venue does it.",
  funding_flip:
    "Net funding turned against the pair: the pair is closed (open) or entries are held (entry).",
  spread_expansion: "Basis widened well past entry: watch for liquidation or exit pressure.",
  max_open_positions: "Open pair cap reached: close a pair before opening another.",
  max_pair_exposure: "One symbol holds too much of the portfolio: skip new entries in it.",
  max_memecoin_exposure: "Memecoin exposure cap reached: skip new memecoin entries.",
};

export type ContinuityHealth = "healthy" | "gaps" | "write_failures" | "empty";

/** One verdict for the capture: gaps and write failures are what an operator acts on. */
export function continuityHealth(data: SnapshotContinuityResponse): ContinuityHealth {
  if (data.rows_total === 0) return "empty";
  if (data.write_failures > 0 || data.last_write_error) return "write_failures";
  if (data.gap_count > 0) return "gaps";
  return "healthy";
}
