import { describe, expect, it } from "vitest";
import type { ConfigPresetName } from "../api/types";
import { PRODUCT_MODES, RISK_LABEL, describePresetThresholds, modeForPreset } from "./productModes";

// Every runtime preset key from the generated API contract.
const PRESET_KEYS: ConfigPresetName[] = ["conservative", "balanced", "aggressive", "exploratory"];

describe("product modes", () => {
  it("maps every runtime preset to exactly one mode, keeping preset keys unchanged", () => {
    expect(PRODUCT_MODES.map((mode) => mode.preset).sort()).toEqual([...PRESET_KEYS].sort());
    expect(new Set(PRODUCT_MODES.map((mode) => mode.key)).size).toBe(PRODUCT_MODES.length);
    for (const preset of PRESET_KEYS) {
      expect(modeForPreset(preset)?.preset).toBe(preset);
    }
  });

  it("keeps the documented mode -> preset compatibility table", () => {
    expect(PRODUCT_MODES.map((mode) => [mode.label, mode.preset, mode.risk])).toEqual([
      ["Steady", "conservative", "lower"],
      ["Standard", "balanced", "moderate"],
      ["Active", "aggressive", "higher"],
      ["Discovery", "exploratory", "highest"],
    ]);
  });

  it("returns null for a preset without a mode", () => {
    expect(modeForPreset("custom")).toBeNull();
  });

  it("spells out every risk level", () => {
    for (const mode of PRODUCT_MODES) {
      expect(RISK_LABEL[mode.risk]).toMatch(/risk$/);
      expect(mode.summary && mode.bestFor && mode.gains && mode.costs).toBeTruthy();
    }
  });
});

describe("describePresetThresholds", () => {
  it("describes the runtime preset values in plain language", () => {
    expect(
      describePresetThresholds({
        min_score_bps: 12,
        min_volume_24h: 1_000_000,
        min_open_interest: 1_000_000,
        min_persistence_hours: 4,
        anti_churn_cooldown_s: 21_600,
        max_entry_slippage_bps: 5,
        max_correlated_positions: 2,
        stale_data_s: 20,
      })
    ).toEqual([
      { label: "Min score after costs", value: "12 bps" },
      { label: "Min 24h volume", value: "$1,000,000" },
      { label: "Min open interest", value: "$1,000,000" },
      { label: "Edge must persist", value: "4 h" },
      { label: "Same-route cooldown", value: "6 h" },
      { label: "Max entry slippage", value: "5 bps" },
      { label: "Correlated positions", value: "up to 2" },
      { label: "Stale data after", value: "20 s" },
    ]);
  });

  it("names disabled floors instead of showing zero", () => {
    const facts = describePresetThresholds({
      min_open_interest: 0,
      min_persistence_hours: 0,
      anti_churn_cooldown_s: 1800,
    });
    expect(facts).toEqual([
      { label: "Min open interest", value: "none" },
      { label: "Edge must persist", value: "no minimum" },
      { label: "Same-route cooldown", value: "30 min" },
    ]);
  });

  it("skips missing or non-numeric fields and parses numeric strings", () => {
    expect(
      describePresetThresholds({
        min_score_bps: "8",
        require_isolated_margin: true,
        stale_data_s: "n/a",
      })
    ).toEqual([{ label: "Min score after costs", value: "8 bps" }]);
  });
});
