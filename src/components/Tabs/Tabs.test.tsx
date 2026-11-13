import { fireEvent, render, screen } from "@testing-library/react";
import Tabs from "./Tabs";

const TABS = [
  { key: "summary", label: "Summary" },
  { key: "replay", label: "Replay" },
  { key: "gate", label: "Gate" },
];

const TABLIST_RECT = {
  left: 100,
  right: 300,
  top: 0,
  bottom: 40,
  width: 200,
  height: 40,
  x: 100,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

const INSIDE_RECT = {
  left: 120,
  right: 200,
  top: 0,
  bottom: 40,
  width: 80,
  height: 40,
  x: 120,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

function clippedRect(side: "left" | "right"): DOMRect {
  return {
    left: side === "left" ? 40 : 340,
    right: side === "left" ? 120 : 420,
    top: 0,
    bottom: 40,
    width: 80,
    height: 40,
    x: side === "left" ? 40 : 340,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("Tabs", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("never scrolls the page with scrollIntoView", () => {
    const scrollIntoViewMock = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    const { rerender } = render(<Tabs tabs={TABS} activeKey="summary" onChange={vi.fn()} />);
    rerender(<Tabs tabs={TABS} activeKey="replay" onChange={vi.fn()} />);

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it("scrolls the tab strip horizontally when the active tab is clipped", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { rerender } = render(<Tabs tabs={TABS} activeKey="summary" onChange={vi.fn()} />);
    const tablist = screen.getByRole("tablist");
    const scrollBy = vi.fn();
    Object.defineProperty(tablist, "scrollBy", { configurable: true, value: scrollBy });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement
    ) {
      if (this.getAttribute("role") === "tablist") return TABLIST_RECT;
      if (this.getAttribute("aria-selected") === "true") return clippedRect("right");
      return INSIDE_RECT;
    });

    rerender(<Tabs tabs={TABS} activeKey="replay" onChange={vi.fn()} />);

    expect(scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ left: 120, behavior: "smooth" })
    );
  });

  it("uses instant horizontal scroll when the user prefers reduced motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const { rerender } = render(<Tabs tabs={TABS} activeKey="summary" onChange={vi.fn()} />);
    const tablist = screen.getByRole("tablist");
    const scrollBy = vi.fn();
    Object.defineProperty(tablist, "scrollBy", { configurable: true, value: scrollBy });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement
    ) {
      if (this.getAttribute("role") === "tablist") return TABLIST_RECT;
      if (this.getAttribute("aria-selected") === "true") return clippedRect("left");
      return INSIDE_RECT;
    });

    rerender(<Tabs tabs={TABS} activeKey="replay" onChange={vi.fn()} />);

    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: -60, behavior: "auto" }));
  });
});
