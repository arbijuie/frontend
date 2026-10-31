import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MorePage from "./MorePage";

describe("MorePage", () => {
  it("keeps expert tools under For experts", () => {
    render(
      <MemoryRouter>
        <MorePage />
      </MemoryRouter>
    );
    const experts = screen.getByRole("region", { name: "For experts" });
    const hrefs = Array.from(experts.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/backtest", "/execution/preflight", "/onboarding", "/operations"]);
  });

  it("links to settings and open deals", () => {
    render(
      <MemoryRouter>
        <MorePage />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /Settings/ }).getAttribute("href")).toBe("/config");
    expect(screen.getByRole("link", { name: /My open deals/ }).getAttribute("href")).toBe(
      "/positions"
    );
  });
});
