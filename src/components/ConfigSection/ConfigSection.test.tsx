import { fireEvent, render, screen } from "@testing-library/react";
import ConfigSection from "./ConfigSection";

describe("ConfigSection", () => {
  it("links the header button to its panel via aria-controls/id", () => {
    render(
      <ConfigSection title="Screener Filters" isOpen={true} onToggle={vi.fn()}>
        <div>content</div>
      </ConfigSection>
    );

    const button = screen.getByRole("button", { name: /screener filters/i });
    const controlsId = button.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
    expect(document.getElementById(controlsId as string)).not.toBeNull();
  });

  it("reflects isOpen via aria-expanded", () => {
    const { rerender } = render(
      <ConfigSection title="Fees" isOpen={false} onToggle={vi.fn()}>
        <div>content</div>
      </ConfigSection>
    );

    expect(screen.getByRole("button", { name: /fees/i }).getAttribute("aria-expanded")).toBe(
      "false"
    );

    rerender(
      <ConfigSection title="Fees" isOpen={true} onToggle={vi.fn()}>
        <div>content</div>
      </ConfigSection>
    );

    expect(screen.getByRole("button", { name: /fees/i }).getAttribute("aria-expanded")).toBe(
      "true"
    );
  });

  it("calls onToggle when the header is clicked", () => {
    const onToggle = vi.fn();
    render(
      <ConfigSection title="Runtime" isOpen={false} onToggle={onToggle}>
        <div>content</div>
      </ConfigSection>
    );

    fireEvent.click(screen.getByRole("button", { name: /runtime/i }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
