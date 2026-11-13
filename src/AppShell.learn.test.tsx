import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./App";

vi.mock("./components/OpportunitiesSocketProvider/OpportunitiesSocketProvider", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("./pages/OpportunitiesPage/OpportunitiesPage", () => ({
  default: () => <h1>Opportunities page mock</h1>,
}));

function renderAt(path: string) {
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

describe("AppShell learn routes", () => {
  it.each([
    ["/learn/about", "Product"],
    ["/learn/how-it-works", "How it works"],
    ["/learn/statistics", "Statistics"],
    ["/learn/journal", "Journal"],
    ["/learn/onboarding", "Onboarding"],
  ])("renders %s with the bottom menu", (path, heading) => {
    renderAt(path);

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Public" })).toBeNull();
    expect(screen.getByRole("link", { name: "More" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Go back" })).toBeTruthy();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Skip to main content" })).toBeTruthy();
  });

  it.each([
    ["/product", "Product"],
    ["/how-it-works", "How it works"],
    ["/statistics", "Statistics"],
    ["/journal", "Journal"],
    ["/onboarding", "Onboarding"],
  ])("redirects the old address %s to its learn page", (path, heading) => {
    renderAt(path);

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
  });

  it("sets the document title for a learn page", () => {
    renderAt("/learn/about");

    expect(document.title).toBe("Product · Arbijuie");
  });

  it("returns to Deals when opened on a learn deep link with no history", () => {
    renderAt("/learn/journal");

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByRole("heading", { level: 1, name: "Opportunities page mock" })).toBeTruthy();
  });

  it("keeps the query and hash when redirecting an old address", () => {
    function Where() {
      const { pathname, search, hash } = useLocation();
      return <div data-testid="where">{`${pathname}${search}${hash}`}</div>;
    }
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/statistics?x=y#venues"]}>
          <AppShell />
          <Where />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("where").textContent).toBe("/learn/statistics?x=y#venues");
  });
});
