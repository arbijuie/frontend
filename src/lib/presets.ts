import type { ConfigResponse } from "../api/types";

export interface Preset {
  name: string;
  description: string;
  values: {
    min_score_bps: number;
    min_volume_24h: number;
    min_open_interest: number;
    min_persistence_hours: number;
    expected_hold_hours: number;
    basis_weight: number;
    stale_data_s: number;
    anti_churn_cooldown_s: number;
    anti_churn_score_multiplier: number;
  };
}

export const PRESETS: Preset[] = [
  {
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
      (Object.keys(preset.values) as (keyof Preset["values"])[]).every((key) =>
        nearlyEqual(config[key], preset.values[key])
      )
    ) ?? null
  );
}
