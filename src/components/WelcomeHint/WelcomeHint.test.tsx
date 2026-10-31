import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import WelcomeHint, { WELCOME_HINT_KEY } from "./WelcomeHint";

const renderHint = () =>
  render(
    <MemoryRouter>
      <WelcomeHint />
    </MemoryRouter>
  );

describe("WelcomeHint", () => {
  beforeEach(() => window.localStorage.clear());

  it("points new users to Getting started", () => {
    renderHint();
    expect(screen.getByRole("link", { name: "Getting started" }).getAttribute("href")).toBe(
      "/welcome"
    );
  });

  it("stays hidden after Got it", () => {
    const { unmount } = renderHint();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(window.localStorage.getItem(WELCOME_HINT_KEY)).toBe("1");
    unmount();
    renderHint();
    expect(screen.queryByRole("region", { name: "Welcome" })).toBeNull();
  });
});
