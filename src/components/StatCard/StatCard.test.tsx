import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("is plain content without a destination", () => {
    render(<StatCard label="Uptime" value="3 h" sub="all good" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Uptime")).toBeTruthy();
    expect(screen.getByText("3 h")).toBeTruthy();
    expect(screen.getByText("all good")).toBeTruthy();
  });

  it("is a link with a name that says where it leads", () => {
    render(
      <MemoryRouter>
        <StatCard label="Ready" value={2} to="/?status=ready" toLabel="Show ready deals" />
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: "Ready, 2. Show ready deals" });
    expect(link.getAttribute("href")).toBe("/?status=ready");
  });

  it("keeps its own text as the name when no destination label is given", () => {
    render(
      <MemoryRouter>
        <StatCard label="Ready" value={2} to="/" />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /Ready/ })).toBeTruthy();
  });
});
