import type { ConfigPresetName, ConfigResponse } from "../api/types";

export type EditableConfigField = string;

type PresetMeta = {
  name: string;
  description: string;
};

const PRESET_META: Record<ConfigPresetName, PresetMeta> = {
  conservative: {
    name: "Conservative",
    description: "Fewer but higher-quality opportunities.",
  },
  balanced: {
    name: "Balanced",
    description: "Default profile for regular monitoring.",
  },
  aggressive: {
    name: "Aggressive",
    description: "High-frequency signal discovery; more noise, faster reaction.",
  },
  exploratory: {
    name: "Exploratory",
    description: "Looser filters for discovery and market exploration.",
  },
};

export interface Preset {
  key: ConfigPresetName;
  name: string;
  description: string;
  values: Record<string, number | boolean>;
}

function prettifyPresetName(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildPresets(config: ConfigResponse): Preset[] {
  return Object.entries(config.runbook_presets).map(([key, values]) => {
    const presetKey = key as ConfigPresetName;
    const meta = PRESET_META[presetKey];
    return {
      key: presetKey,
      name: meta?.name ?? prettifyPresetName(key),
      description: meta?.description ?? "Runtime-provided preset values.",
      values,
    };
  });
}

const EPSILON = 0.001;

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

export function findMatchingPreset(config: ConfigResponse, presets: Preset[]): Preset | null {
  return presets.find((preset) => {
    return config.runbook_config_fields.every((key) => {
      const configValue = config[key as keyof ConfigResponse];
      const presetValue = preset.values[key];
      if (presetValue === undefined) {
        return false;
      }
      if (typeof configValue === "number" && typeof presetValue === "number") {
        return nearlyEqual(configValue, presetValue);
      }
      if (typeof configValue === "boolean" && typeof presetValue === "boolean") {
        return configValue === presetValue;
      }
      return false;
    });
  }) ?? null;
}
