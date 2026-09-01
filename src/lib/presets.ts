import type { ConfigResponse } from "../api/types";

export type EditableConfigField =
  | "min_score_bps"
  | "min_volume_24h"
  | "min_open_interest"
  | "min_persistence_hours"
  | "expected_hold_hours"
  | "basis_weight"
  | "stale_data_s"
  | "anti_churn_cooldown_s"
  | "anti_churn_score_multiplier";

export const EDITABLE_CONFIG_FIELDS: EditableConfigField[] = [
  "min_score_bps",
  "min_volume_24h",
  "min_open_interest",
  "min_persistence_hours",
  "expected_hold_hours",
  "basis_weight",
  "stale_data_s",
  "anti_churn_cooldown_s",
  "anti_churn_score_multiplier",
];

export interface Preset {
  key: "conservative" | "balanced" | "aggressive";
  name: string;
  description: string;
  values: Record<EditableConfigField, number>;
}

export const PRESETS: Preset[] = [
  {
    key: "conservative",
    name: "Conservative",
    description: "Fewer but higher-quality opportunities.",
    values: {
      min_score_bps: 12,
      min_volume_24h: 1_000_000,
      min_open_interest: 1_000_000,
      min_persistence_hours: 4,
      expected_hold_hours: 72,
      basis_weight: 0.4,
      stale_data_s: 20,
      anti_churn_cooldown_s: 21600,
      anti_churn_score_multiplier: 1.7,
    },
  },
  {
    key: "balanced",
    name: "Balanced",
    description: "Default profile for regular monitoring.",
    values: {
      min_score_bps: 8,
      min_volume_24h: 250_000,
      min_open_interest: 500_000,
      min_persistence_hours: 2,
      expected_hold_hours: 72,
      basis_weight: 0.5,
      stale_data_s: 30,
      anti_churn_cooldown_s: 14400,
      anti_churn_score_multiplier: 1.5,
    },
  },
  {
    key: "aggressive",
    name: "Aggressive",
    description: "High-frequency signal discovery; more noise, faster reaction.",
    values: {
      min_score_bps: 5,
      min_volume_24h: 100_000,
      min_open_interest: 0,
      min_persistence_hours: 0,
      expected_hold_hours: 48,
      basis_weight: 0.6,
      stale_data_s: 45,
      anti_churn_cooldown_s: 7200,
      anti_churn_score_multiplier: 1.3,
    },
  },
];

const EPSILON = 0.001;

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

export function findMatchingPreset(config: ConfigResponse): Preset | null {
  return (
    PRESETS.find((preset) =>
      EDITABLE_CONFIG_FIELDS.every((key) =>
        nearlyEqual(config[key], preset.values[key])
      )
    ) ?? null
  );
}
