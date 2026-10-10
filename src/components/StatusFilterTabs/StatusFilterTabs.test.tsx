import { fireEvent, render, screen } from "@testing-library/react";
import StatusFilterTabs from "./StatusFilterTabs";

describe("StatusFilterTabs", () => {
  const counts = { all: 10, ready: 2, watching: 3, blocked: 5 };

  it("renders a labelled group with one button per filter", () => {
    render(<StatusFilterTabs value="all" onChange={vi.fn()} counts={counts} />);

    expect(screen.getByRole("group", { name: "Filter opportunities by status" })).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("marks only the active filter as pressed", () => {
    render(<StatusFilterTabs value="ready" onChange={vi.fn()} counts={counts} />);

    expect(screen.getByRole("button", { name: /^ready/i }).getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(screen.getByRole("button", { name: /^all/i }).getAttribute("aria-pressed")).toBe(
      "false"
    );
    expect(screen.getByRole("button", { name: /^watching/i }).getAttribute("aria-pressed")).toBe(
      "false"
    );
  });

  it("keeps every filter in the normal Tab order", () => {
    render(<StatusFilterTabs value="all" onChange={vi.fn()} counts={counts} />);

    for (const button of screen.getAllByRole("button")) {
      expect(button.getAttribute("tabindex")).toBeNull();
    }
  });

  it("calls onChange with the clicked filter", () => {
    const onChange = vi.fn();
    render(<StatusFilterTabs value="all" onChange={onChange} counts={counts} />);

    fireEvent.click(screen.getByRole("button", { name: /^blocked/i }));

    expect(onChange).toHaveBeenCalledWith("blocked");
  });
});
