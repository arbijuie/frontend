import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProductModes from "./ProductModes";
import type { ConfigResponse } from "../../api/types";

function makeConfig(minScore: number): ConfigResponse {
  return {
    min_score_bps: minScore,
    runbook_config_fields: ["min_score_bps"],
    runbook_presets: {
      conservative: { min_score_bps: 12, min_open_interest: 1_000_000 },
      balanced: { min_score_bps: 8, min_open_interest: 500_000 },
      aggressive: { min_score_bps: 5, min_open_interest: 0 },
      exploratory: { min_score_bps: 4, min_open_interest: 0 },
    },
  } as unknown as ConfigResponse;
}

describe("ProductModes", () => {
  it("renders one card per runtime preset with its live thresholds, strictest first", () => {
    render(
      <ProductModes
        config={makeConfig(8)}
        onApplyPreset={vi.fn()}
        applyingPresetKey={null}
        disableAll={false}
      />
    );

    const cards = screen.getAllByRole("article");
    expect(cards.map((card) => card.querySelector("h3")?.textContent)).toEqual([
      "Steady",
      "Standard",
      "Active",
      "Discovery",
    ]);
    const steady = within(screen.getByRole("article", { name: "Steady" }));
    expect(steady.getByText("12 bps")).toBeTruthy();
    expect(steady.getByText("$1,000,000")).toBeTruthy();
    const active = within(screen.getByRole("article", { name: "Active" }));
    expect(active.getByText("none")).toBeTruthy();
  });

  it("marks the mode whose preset matches the live config as active", () => {
    render(
      <ProductModes
        config={makeConfig(8)}
        onApplyPreset={vi.fn()}
        applyingPresetKey={null}
        disableAll={false}
      />
    );

    const standard = within(screen.getByRole("article", { name: "Standard" }));
    expect(standard.getByRole("status").textContent).toBe("Currently active");
    expect(screen.queryByText(/running a custom configuration/i)).toBeNull();
  });

  it("explains a custom configuration when no preset matches", () => {
    render(
      <ProductModes
        config={makeConfig(9.5)}
        onApplyPreset={vi.fn()}
        applyingPresetKey={null}
        disableAll={false}
      />
    );

    expect(screen.getByText(/running a custom configuration/i)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Apply .* mode$/ })).toHaveLength(4);
  });

  it("applies the unchanged runtime preset key", () => {
    const onApplyPreset = vi.fn();
    render(
      <ProductModes
        config={makeConfig(8)}
        onApplyPreset={onApplyPreset}
        applyingPresetKey={null}
        disableAll={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Apply Discovery mode" }));
    expect(onApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "exploratory",
        values: { min_score_bps: 4, min_open_interest: 0 },
      })
    );
  });

  it("shows the mode to preset compatibility table", () => {
    render(
      <ProductModes
        config={makeConfig(8)}
        onApplyPreset={vi.fn()}
        applyingPresetKey={null}
        disableAll={false}
      />
    );

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      "SteadyconservativeLower risk",
      "StandardbalancedModerate risk",
      "ActiveaggressiveHigher risk",
      "DiscoveryexploratoryHighest risk",
    ]);
  });
});
