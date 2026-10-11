import { render, screen, within } from "@testing-library/react";
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
});
