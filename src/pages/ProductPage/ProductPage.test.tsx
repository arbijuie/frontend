import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import ProductPage from "./ProductPage";

describe("ProductPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("explains the product and every mode without calling the API", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<ProductPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Product" })).toBeTruthy();
    for (const name of ["Steady", "Standard", "Active", "Discovery"]) {
      expect(screen.getByRole("article", { name })).toBeTruthy();
    }
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.title).toBe("Product · Arbijuie");
  });
});
