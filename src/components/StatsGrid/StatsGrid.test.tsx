import { fireEvent, render, screen } from "@testing-library/react";
import StatsGrid from "./StatsGrid";
import type { OpportunityItem } from "../../api/types";
import type { StatusFilter } from "../../lib/opportunitiesUrlState";

const item = (status: OpportunityItem["status"]) => ({ status }) as OpportunityItem;

const ITEMS = [item("ready"), item("watching"), item("watching"), item("blocked")];

function renderGrid(statusFilter: StatusFilter = "all", onChange = vi.fn(), items = ITEMS) {
  render(<StatsGrid items={items} statusFilter={statusFilter} onStatusFilterChange={onChange} />);
  return onChange;
}

describe("StatsGrid", () => {
  it("shows a named group with one button per status and the counts in the names", () => {
    renderGrid();
    const group = screen.getByRole("group", { name: "Filter deals by status" });
    expect(group.querySelectorAll("button")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Show all deals (4)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show ready deals (1)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show watching deals (2)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show blocked deals (1)" })).toBeTruthy();
  });

  it("marks only the selected tile as pressed", () => {
    renderGrid("watching");
    const pressed = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    expect(pressed[0].getAttribute("aria-label")).toBe("Show watching deals (2)");
  });

  it("calls the handler with the status of the clicked tile", () => {
    const onChange = renderGrid();
    fireEvent.click(screen.getByRole("button", { name: "Show ready deals (1)" }));
    expect(onChange).toHaveBeenCalledWith("ready");
  });

  it("resets the filter with the All tile", () => {
    const onChange = renderGrid("blocked");
    fireEvent.click(screen.getByRole("button", { name: "Show all deals (4)" }));
    expect(onChange).toHaveBeenCalledWith("all");
  });

  it("keeps a tile with a zero count clickable", () => {
    const onChange = renderGrid("all", vi.fn(), [item("watching")]);
    const ready = screen.getByRole("button", { name: "Show ready deals (0)" }) as HTMLButtonElement;
    expect(ready.disabled).toBe(false);
    fireEvent.click(ready);
    expect(onChange).toHaveBeenCalledWith("ready");
  });

  it("shows the hint until the first selection", () => {
    renderGrid();
    expect(screen.getByText("Tap a card to filter")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show ready deals (1)" }));
    expect(screen.queryByText("Tap a card to filter")).toBeNull();
  });

  it("hides the hint when a filter is already active", () => {
    renderGrid("ready");
    expect(screen.queryByText("Tap a card to filter")).toBeNull();
  });
});
