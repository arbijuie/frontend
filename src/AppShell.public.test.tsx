import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./App";

vi.mock("./components/OpportunitiesSocketProvider/OpportunitiesSocketProvider", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell />
    </MemoryRouter>
  );
}

describe("AppShell public routes", () => {
  it.each([
    ["/product", "Product"],
    ["/how-it-works", "How it works"],
    ["/statistics", "Statistics"],
    ["/onboarding", "Onboarding"],
  ])("renders %s by direct URL with the public layout", (path, heading) => {
    renderAt(path);

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Public" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeNull();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Skip to main content" })).toBeTruthy();
  });

  it("marks the current public link and links to all four public pages", () => {
    renderAt("/statistics");

    const nav = screen.getByRole("navigation", { name: "Public" });
    expect(nav.querySelectorAll("a")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Statistics" }).getAttribute("aria-current")).toBe(
      "page"
    );
  });

  it("sets the document title for a public page", () => {
    renderAt("/product");

    expect(document.title).toBe("Product · Arbijuie");
  });

  it("does not show the public navigation on operator pages", () => {
    renderAt("/nope");

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Public" })).toBeNull();
  });
});
