import { act, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";
import RouteAnnouncer from "./RouteAnnouncer";

function renderWithLink() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Link to="/status">Go to status</Link>
      <RouteAnnouncer />
    </MemoryRouter>
  );
}

describe("RouteAnnouncer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.title = "Opportunities · Arbijuie";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays silent on the initial render", () => {
    renderWithLink();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("route-announcer").textContent).toBe("");
  });

  it("announces the new page title after a route change", () => {
    renderWithLink();

    fireEvent.click(screen.getByRole("link", { name: "Go to status" }));
    document.title = "Status · Arbijuie";
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByTestId("route-announcer").textContent).toBe("Status · Arbijuie");
  });
});
