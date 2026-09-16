import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Nav from "./Nav";
import { NAV_ITEMS } from "../../lib/navigation";

function renderNav(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Nav />
    </MemoryRouter>
  );
}

describe("Nav", () => {
  it("renders all sections in workflow order with unique routes", () => {
    renderNav("/");
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const links = Array.from(nav.querySelectorAll("a"));

    expect(links.map((link) => link.textContent)).toEqual([
      "Opportunities",
      "Status",
      "Config",
      "Backtest",
      "Execution",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/status",
      "/config",
      "/backtest",
      "/execution",
    ]);
    expect(new Set(NAV_ITEMS.map((item) => item.to)).size).toBe(NAV_ITEMS.length);
  });

  it.each(NAV_ITEMS.map((item) => [item.label, item.to]))(
    "marks only %s as the current page on %s",
    (label, path) => {
      renderNav(path);
      const current = screen
        .getAllByRole("link")
        .filter((link) => link.getAttribute("aria-current") === "page");
      expect(current).toHaveLength(1);
      expect(current[0].textContent).toContain(label);
    }
  );

  it("does not mark Opportunities active on nested unknown paths", () => {
    renderNav("/does-not-exist");
    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(0);
  });

  it("exposes links in tab order and hides decorative icons from assistive tech", () => {
    renderNav("/");
    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link.tabIndex).toBe(0);
      expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    }
  });
});
