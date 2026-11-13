import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, afterEach } from "vitest";
import ProductPage from "./ProductPage";

describe("ProductPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("explains the product and every mode without calling the API", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <MemoryRouter>
        <ProductPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Product" })).toBeTruthy();
    for (const name of ["Steady", "Standard", "Active", "Discovery"]) {
      expect(screen.getByRole("article", { name })).toBeTruthy();
    }
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.title).toBe("Product · Arbijuie");
  });

  it("sends every mode card to Settings, where the mode is a personal choice", () => {
    render(
      <MemoryRouter>
        <ProductPage />
      </MemoryRouter>
    );

    const lead = screen.getByText(/each user picks a mode in settings/i);
    expect(lead.textContent).toContain("never changes the shared runtime settings");
    expect(screen.queryByText(/operators switch modes/i)).toBeNull();

    for (const name of ["Steady", "Standard", "Active", "Discovery"]) {
      const card = within(screen.getByRole("article", { name }));
      const link = card.getByRole("link", { name: `Choose in Settings: ${name}` });
      expect(link.getAttribute("href")).toBe("/config");
    }
  });
});
