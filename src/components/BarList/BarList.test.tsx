import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BarList from "./BarList";

describe("BarList", () => {
  it("prints every label and value and scales bars to the largest value", () => {
    render(
      <BarList
        label="Funnel"
        items={[
          { label: "Found", value: 200 },
          { label: "Ready", value: 50, note: "25%" },
        ]}
      />
    );

    const list = screen.getByRole("list", { name: "Funnel" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual(["Found200", "Ready50 25%"]);
    const bars = screen.getAllByTestId("bar");
    expect(bars[0].style.width).toBe("100%");
    expect(bars[1].style.width).toBe("25%");
  });

  it("draws empty bars when every value is zero", () => {
    render(<BarList label="Empty" items={[{ label: "None", value: 0 }]} />);
    expect(screen.getByTestId("bar").style.width).toBe("0%");
  });

  it("renders no links for rows without a destination", () => {
    render(<BarList label="Plain" items={[{ label: "A", value: 1 }]} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("turns a row with a destination into a link that says where it leads", () => {
    render(
      <MemoryRouter>
        <BarList
          label="Decisions"
          items={[
            {
              label: "Ready",
              value: 3,
              note: "60%",
              to: "/?status=ready",
              toLabel: "Show ready deals",
            },
            { label: "Blocked", value: 2 },
          ]}
        />
      </MemoryRouter>
    );

    const link = screen.getByRole("link", { name: "Ready, 3. Show ready deals" });
    expect(link.getAttribute("href")).toBe("/?status=ready");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    const rows = within(screen.getByRole("list", { name: "Decisions" })).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual(["Ready3 60%", "Blocked2"]);
  });
});
