import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./App";

vi.mock("./components/OpportunitiesSocketProvider/OpportunitiesSocketProvider", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function renderAt(path: string) {
  // Public pages read public projections; offline here, they render their error states.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppShell />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("AppShell public routes", () => {
  it.each([
    ["/product", "Product"],
    ["/how-it-works", "How it works"],
    ["/statistics", "Statistics"],
    ["/journal", "Journal"],
    ["/onboarding", "Onboarding"],
  ])("renders %s by direct URL with the public layout", (path, heading) => {
    renderAt(path);

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Public" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeNull();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Skip to main content" })).toBeTruthy();
  });

  it("marks the current public link and links to all five public pages", () => {
    renderAt("/statistics");

    const nav = screen.getByRole("navigation", { name: "Public" });
    expect(nav.querySelectorAll("a")).toHaveLength(5);
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
