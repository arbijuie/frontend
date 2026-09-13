import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./App";

vi.mock("./pages/OpportunitiesPage/OpportunitiesPage", () => ({
  default: () => <h1>Opportunities page mock</h1>,
}));
vi.mock("./pages/StatusPage/StatusPage", () => ({
  default: () => <h1>Status page mock</h1>,
}));
vi.mock("./pages/ConfigPage/ConfigPage", () => ({
  default: () => {
    throw new Error("config exploded");
  },
}));
vi.mock("./pages/BacktestPage/BacktestPage", () => ({
  default: () => <h1>Backtest page mock</h1>,
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell />
    </MemoryRouter>
  );
}

describe("AppShell routing", () => {
  it.each([
    ["/", "Opportunities page mock"],
    ["/status", "Status page mock"],
    ["/backtest", "Backtest page mock"],
    ["/execution", "Execution"],
  ])("renders %s by direct URL", (path, heading) => {
    renderAt(path);
    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
  });

  it("renders a not-found page for unknown routes and keeps navigation available", () => {
    renderAt("/nope");
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeTruthy();
    expect(screen.getByText('No section matches "/nope"')).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to Opportunities" }).getAttribute("href")).toBe(
      "/"
    );
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
  });

  it("contains a page render error inside the route boundary", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    renderAt("/config");
    expect(screen.getByRole("alert").textContent).toContain("Error: config exploded");
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
    consoleError.mockRestore();
  });
});
