import { fireEvent, render, screen } from "@testing-library/react";
import Tabs from "./Tabs";

const TABS = [
  { key: "summary", label: "Summary" },
  { key: "replay", label: "Replay" },
  { key: "gate", label: "Gate" },
];

describe("Tabs", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("marks only the active tab as selected", () => {
    render(<Tabs tabs={TABS} activeKey="replay" onChange={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Replay" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Summary" }).getAttribute("aria-selected")).toBe(
      "false"
    );
  });

  it("keeps every tab in the normal Tab order", () => {
    render(<Tabs tabs={TABS} activeKey="replay" onChange={vi.fn()} />);

    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.getAttribute("tabindex")).toBeNull();
    }
  });

  it("moves to the next tab on ArrowRight, wrapping from the last", () => {
    const onChange = vi.fn();
    render(<Tabs tabs={TABS} activeKey="gate" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole("tab", { name: "Gate" }), { key: "ArrowRight" });

    expect(onChange).toHaveBeenCalledWith("summary");
  });

  it("moves to the previous tab on ArrowLeft, wrapping from the first", () => {
    const onChange = vi.fn();
    render(<Tabs tabs={TABS} activeKey="summary" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole("tab", { name: "Summary" }), { key: "ArrowLeft" });

    expect(onChange).toHaveBeenCalledWith("gate");
  });

  it("labels the tab list and points each tab at its panel", () => {
    render(
      <Tabs
        tabs={TABS}
        activeKey="replay"
        onChange={vi.fn()}
        label="Backtest sections"
        idPrefix="bt"
      />
    );

    expect(screen.getByRole("tablist", { name: "Backtest sections" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Replay" }).getAttribute("aria-controls")).toBe(
      "bt-tabpanel-replay"
    );
  });

  it("uses smooth scroll when the user has no reduced-motion preference", () => {
    const scrollIntoViewMock = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    render(<Tabs tabs={TABS} activeKey="summary" onChange={vi.fn()} />);

    expect(scrollIntoViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" })
    );
  });

  it("uses instant scroll when the user prefers reduced motion", () => {
    const scrollIntoViewMock = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });

    render(<Tabs tabs={TABS} activeKey="summary" onChange={vi.fn()} />);

    expect(scrollIntoViewMock).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
  });
});
