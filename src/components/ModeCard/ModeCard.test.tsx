import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ModeCard from "./ModeCard";
import { PRODUCT_MODES } from "../../lib/productModes";

const steady = PRODUCT_MODES[0];

describe("ModeCard", () => {
  it("shows the mode, its preset, risk and tradeoffs without operator controls", () => {
    render(<ModeCard mode={steady} />);

    const card = screen.getByRole("article", { name: "Steady" });
    expect(card.textContent).toContain("conservative");
    expect(card.textContent).toContain("Lower risk");
    expect(card.textContent).toContain(steady.bestFor);
    expect(card.textContent).toContain(steady.gains);
    expect(card.textContent).toContain(steady.costs);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("lists live thresholds when they are provided", () => {
    render(
      <ModeCard mode={steady} thresholds={[{ label: "Min score after costs", value: "12 bps" }]} />
    );

    expect(screen.getByText("Min score after costs")).toBeTruthy();
    expect(screen.getByText("12 bps")).toBeTruthy();
  });

  it("applies the mode from its button", () => {
    const onApply = vi.fn();
    render(
      <ModeCard
        mode={steady}
        action={{ isActive: false, isApplying: false, isDisabled: false, onApply }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Apply Steady mode" }));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("marks the active mode instead of offering to apply it", () => {
    render(
      <ModeCard
        mode={steady}
        action={{ isActive: true, isApplying: false, isDisabled: false, onApply: vi.fn() }}
      />
    );

    expect(screen.getByRole("status").textContent).toBe("Currently active");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows progress and disables the button while applying", () => {
    render(
      <ModeCard
        mode={steady}
        action={{ isActive: false, isApplying: true, isDisabled: true, onApply: vi.fn() }}
      />
    );

    const button = screen.getByRole("button", { name: "Applying..." }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });
});
