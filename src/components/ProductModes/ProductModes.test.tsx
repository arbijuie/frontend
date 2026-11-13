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

type Props = Parameters<typeof ProductModes>[0];

function renderModes(overrides: Partial<Props> = {}) {
  const props: Props = {
    config: makeConfig(8),
    selectedPreset: null,
    hasOverrides: false,
    onApplyPreset: vi.fn(),
    applyingPresetKey: null,
    disableAll: false,
    ...overrides,
  };
  return { ...render(<ProductModes {...props} />), props };
}

describe("ProductModes", () => {
  it("renders one card per runtime preset with its live thresholds, strictest first", () => {
    renderModes();

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

  it("marks the user's selected preset as the active mode, not the live config", () => {
    // Live config matches "balanced", but the user chose "conservative".
    renderModes({ selectedPreset: "conservative" });

    const steady = within(screen.getByRole("article", { name: "Steady" }));
    expect(steady.getByRole("status").textContent).toBe("Currently active");
    const standard = within(screen.getByRole("article", { name: "Standard" }));
    expect(standard.getByRole("button", { name: "Apply Standard mode" })).toBeTruthy();
    expect(screen.queryByText(/follows the live runtime settings/i)).toBeNull();
  });

  it("says the user follows the live runtime settings when no preset is selected", () => {
    renderModes({ selectedPreset: null });

    const note = screen.getByText(/follows the live runtime settings/i);
    expect(note.textContent).toContain("match the Standard mode");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Apply .* mode$/ })).toHaveLength(4);
  });

  it("names a custom live configuration when the runtime matches no mode", () => {
    renderModes({ config: makeConfig(9.5), selectedPreset: null });

    expect(screen.getByText(/follows the live runtime settings/i).textContent).toContain(
      "match no mode (custom values)"
    );
  });

  it("warns that applying a mode clears manual overrides", () => {
    renderModes({ selectedPreset: "balanced", hasOverrides: true });

    expect(screen.getByText(/applying a mode clears them/i)).toBeTruthy();
    const standard = within(screen.getByRole("article", { name: "Standard" }));
    expect(standard.getByText("Currently active")).toBeTruthy();
  });

  it("does not mention overrides when the profile has none", () => {
    renderModes({ selectedPreset: "balanced", hasOverrides: false });

    expect(screen.queryByText(/applying a mode clears them/i)).toBeNull();
    expect(screen.queryByText(/follows the live runtime settings/i)).toBeNull();
  });

  it("applies the unchanged runtime preset key", () => {
    const { props } = renderModes({ selectedPreset: "balanced" });

    fireEvent.click(screen.getByRole("button", { name: "Apply Discovery mode" }));
    expect(props.onApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "exploratory",
        values: { min_score_bps: 4, min_open_interest: 0 },
      })
    );
  });

  it("shows progress on the applying card and disables the others", () => {
    renderModes({ applyingPresetKey: "aggressive", disableAll: true });

    const applying = screen.getByRole("button", { name: "Applying..." }) as HTMLButtonElement;
    expect(applying.getAttribute("aria-busy")).toBe("true");
    const steady = within(screen.getByRole("article", { name: "Steady" }));
    expect((steady.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the mode to preset compatibility table", () => {
    renderModes();

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
