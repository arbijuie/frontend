import { fireEvent, render, screen } from "@testing-library/react";
import FloatingRefreshButton from "./FloatingRefreshButton";

describe("FloatingRefreshButton", () => {
  it("calls onClick when idle", () => {
    const onClick = vi.fn();
    render(<FloatingRefreshButton fetching={false} onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh opportunities" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("ignores clicks while fetching but stays focusable", () => {
    const onClick = vi.fn();
    render(<FloatingRefreshButton fetching={true} onClick={onClick} />);

    const button = screen.getByRole("button", { name: "Refresh opportunities" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });
});
