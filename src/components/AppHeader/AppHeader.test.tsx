import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, useLocation, useNavigate, type InitialEntry } from "react-router-dom";
import AppHeader from "./AppHeader";
import HistoryPositionProvider from "../HistoryPositionProvider/HistoryPositionProvider";

function Where() {
  const location = useLocation();
  return (
    <>
      <div data-testid="where">{location.pathname}</div>
      <div data-testid="search">{location.search}</div>
    </>
  );
}

function ReadyFilter() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/?status=ready")}>Ready</button>;
}

function renderHeader(entries: InitialEntry[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <HistoryPositionProvider>
        <AppHeader>
          <nav>
            <Link to="/status">Health</Link>
            <Link to="/config">Settings</Link>
            <ReadyFilter />
          </nav>
        </AppHeader>
        <Where />
      </HistoryPositionProvider>
    </MemoryRouter>
  );
}

const back = () => screen.getByRole("button", { name: "Go back" });
const forward = () => screen.getByRole("button", { name: "Go forward" });
const isOff = (button: HTMLElement) => button.getAttribute("aria-disabled") === "true";
const where = () => screen.getByTestId("where").textContent;
const search = () => screen.getByTestId("search").textContent;

describe("AppHeader history buttons", () => {
  it("marks Back and Forward unavailable on the home page", () => {
    renderHeader();
    expect(isOff(back())).toBe(true);
    expect(isOff(forward())).toBe(true);
  });

  it("keeps unavailable buttons reachable with the keyboard", () => {
    renderHeader();
    expect((back() as HTMLButtonElement).disabled).toBe(false);
    expect((forward() as HTMLButtonElement).disabled).toBe(false);
  });

  it("does nothing when an unavailable button is clicked", () => {
    renderHeader();
    fireEvent.click(back());
    fireEvent.click(forward());
    expect(where()).toBe("/");
  });

  it("makes Back available, but not Forward, after opening a page", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("link", { name: "Health" }));
    expect(where()).toBe("/status");
    expect(isOff(back())).toBe(false);
    expect(isOff(forward())).toBe(true);
  });

  it("goes back through the real history and then forward again", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("link", { name: "Health" }));
    fireEvent.click(screen.getByRole("link", { name: "Settings" }));
    expect(where()).toBe("/config");

    fireEvent.click(back());
    expect(where()).toBe("/status");
    expect(isOff(forward())).toBe(false);

    fireEvent.click(back());
    expect(where()).toBe("/");
    expect(isOff(back())).toBe(true);

    fireEvent.click(forward());
    expect(where()).toBe("/status");
    fireEvent.click(forward());
    expect(where()).toBe("/config");
    expect(isOff(forward())).toBe(true);
  });

  it("drops Forward when a new page is opened after going back", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("link", { name: "Health" }));
    fireEvent.click(back());
    expect(isOff(forward())).toBe(false);

    fireEvent.click(screen.getByRole("link", { name: "Settings" }));
    expect(where()).toBe("/config");
    expect(isOff(forward())).toBe(true);
  });

  it("walks through query changes on the same page", () => {
    renderHeader();
    expect(isOff(back())).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Ready" }));
    expect(search()).toBe("?status=ready");
    expect(isOff(back())).toBe(false);

    fireEvent.click(back());
    expect(search()).toBe("");
    expect(isOff(back())).toBe(true);
    expect(isOff(forward())).toBe(false);

    fireEvent.click(forward());
    expect(search()).toBe("?status=ready");
  });

  it("falls back to Deals on a deep link with no history", () => {
    renderHeader(["/positions"]);
    expect(isOff(back())).toBe(false);
    fireEvent.click(back());
    expect(where()).toBe("/");
    expect(isOff(forward())).toBe(true);
  });

  it("falls back to the page it came from on a deep link", () => {
    renderHeader([{ pathname: "/positions", state: { from: "/more" } }]);
    fireEvent.click(back());
    expect(where()).toBe("/more");
  });

  it("names the buttons for assistive technology and gives a tooltip", () => {
    renderHeader();
    expect(back().getAttribute("aria-label")).toBe("Go back");
    expect(back().getAttribute("title")).toBe("Back");
    expect(forward().getAttribute("aria-label")).toBe("Go forward");
    expect(forward().getAttribute("title")).toBe("Forward");
  });
});
