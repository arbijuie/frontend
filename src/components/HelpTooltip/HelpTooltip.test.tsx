import { fireEvent, render, screen } from "@testing-library/react";
import HelpTooltip from "./HelpTooltip";

describe("HelpTooltip", () => {
  it("renders a button with an accessible name but no visible bubble initially", () => {
    render(<HelpTooltip label="Liquidity tier" text="Some explanation" />);

    expect(screen.getByRole("button", { name: "Help: Liquidity tier" })).toBeTruthy();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens the bubble on click and sets aria-expanded/aria-describedby", () => {
    render(<HelpTooltip label="Liquidity tier" text="Some explanation" />);

    const button = screen.getByRole("button", { name: "Help: Liquidity tier" });
    fireEvent.click(button);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toBe("Some explanation");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-describedby")).toBe(tooltip.id);
  });

  it("closes on a second click of the button", () => {
    render(<HelpTooltip label="Liquidity tier" text="Some explanation" />);

    const button = screen.getByRole("button", { name: "Help: Liquidity tier" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes when clicking outside", () => {
    render(
      <div>
        <HelpTooltip label="Liquidity tier" text="Some explanation" />
        <button type="button">Outside</button>
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: "Help: Liquidity tier" }));
    expect(screen.getByRole("tooltip")).toBeTruthy();

    fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("closes on Escape", () => {
    render(<HelpTooltip label="Liquidity tier" text="Some explanation" />);

    fireEvent.click(screen.getByRole("button", { name: "Help: Liquidity tier" }));
    expect(screen.getByRole("tooltip")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
