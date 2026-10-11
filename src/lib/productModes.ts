import type { ConfigPresetName } from "../api/types";

/**
 * User-facing product modes (issue #303). Each mode is a name and a description on top of
 * one runtime runbook preset. Preset keys and the config apply flow (`PATCH /config` with
 * `preset`) do not change; a mode only decides which preset key is sent.
 */
export type ProductModeKey = "steady" | "standard" | "active" | "discovery";

export type ProductModeRisk = "lower" | "moderate" | "higher" | "highest";

export interface ProductMode {
  key: ProductModeKey;
  label: string;
  /** Runtime runbook preset this mode applies. Never renamed. */
  preset: ConfigPresetName;
  risk: ProductModeRisk;
  summary: string;
  bestFor: string;
  gains: string;
  costs: string;
}

export const RISK_LABEL: Record<ProductModeRisk, string> = {
  lower: "Lower risk",
  moderate: "Moderate risk",
  higher: "Higher risk",
  highest: "Highest risk",
};

// Ordered from strictest to loosest filters, matching the runtime presets.
export const PRODUCT_MODES: readonly ProductMode[] = [
  {
    key: "steady",
    label: "Steady",
    preset: "conservative",
    risk: "lower",
    summary: "Fewer, higher-quality signals on deep, established markets.",
    bestFor: "Unattended monitoring and the first weeks with real capital.",
    gains:
      "The strictest score, volume, open-interest and persistence floors, the longest re-entry cooldown and the fewest correlated positions.",
    costs: "Skips young or smaller markets and short-lived edges, so expect fewer alerts.",
  },
  {
    key: "standard",
    label: "Standard",
    preset: "balanced",
    risk: "moderate",
    summary: "The default profile for regular monitoring.",
    bestFor: "Day-to-day operation with an operator checking in.",
    gains: "Catches most persistent edges on liquid markets with moderate filters.",
    costs: "Some signals fade before the funding they collect pays back fees.",
  },
  {
    key: "active",
    label: "Active",
    preset: "aggressive",
    risk: "higher",
    summary: "Faster reaction to new signals with looser liquidity floors.",
    bestFor: "Watched sessions where an operator reviews each READY signal.",
    gains: "Signals appear sooner: no persistence or open-interest floor and a shorter cooldown.",
    costs:
      "More noise and churn, a wider slippage allowance and a shorter expected hold, so each entry has less room for error.",
  },
  {
    key: "discovery",
    label: "Discovery",
    preset: "exploratory",
    risk: "highest",
    summary: "The loosest filters, for market exploration and research.",
    bestFor: "Finding new routes and calibrating thresholds, not unattended execution.",
    gains:
      "The widest coverage, the shortest re-entry cooldown and the most correlated positions allowed.",
    costs:
      "The most noise and the longest stale-data tolerance. Treat signals as leads to investigate, not entries.",
  },
];

const MODE_BY_PRESET = new Map<string, ProductMode>(
  PRODUCT_MODES.map((mode) => [mode.preset, mode])
);

/** The product mode for a runtime preset key, or null for a preset without a mode. */
export function modeForPreset(preset: string): ProductMode | null {
  return MODE_BY_PRESET.get(preset) ?? null;
}

export interface ThresholdFact {
  label: string;
  value: string;
}

type PresetValues = Record<string, number | boolean | string>;

function numeric(values: PresetValues, key: string): number | null {
  const value = values[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatHours(hours: number): string {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}

function formatCooldown(seconds: number): string {
  if (seconds >= 3600) return formatHours(seconds / 3600);
  return `${Math.round(seconds / 60)} min`;
}

/**
 * Plain-language thresholds of a runtime preset, read from the live `runbook_presets`
 * payload so the cards always match what the runtime will apply. Missing fields are skipped.
 */
export function describePresetThresholds(values: PresetValues): ThresholdFact[] {
  const facts: ThresholdFact[] = [];
  const add = (key: string, label: string, format: (value: number) => string) => {
    const value = numeric(values, key);
    if (value !== null) facts.push({ label, value: format(value) });
  };

  add("min_score_bps", "Min score after costs", (value) => `${value} bps`);
  add("min_volume_24h", "Min 24h volume", formatUsd);
  add("min_open_interest", "Min open interest", (value) => (value > 0 ? formatUsd(value) : "none"));
  add("min_persistence_hours", "Edge must persist", (value) =>
    value > 0 ? formatHours(value) : "no minimum"
  );
  add("anti_churn_cooldown_s", "Same-route cooldown", formatCooldown);
  add("max_entry_slippage_bps", "Max entry slippage", (value) => `${value} bps`);
  add("max_correlated_positions", "Correlated positions", (value) => `up to ${value}`);
  add("stale_data_s", "Stale data after", (value) => `${value} s`);
  return facts;
}
