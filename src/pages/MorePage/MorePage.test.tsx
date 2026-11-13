import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MorePage from "./MorePage";

describe("MorePage", () => {
  it("keeps gated tools under For experts and Learn under operator paths", () => {
    render(
      <MemoryRouter>
        <MorePage />
      </MemoryRouter>
    );
    const experts = screen.getByRole("region", { name: "For experts" });
    const hrefs = Array.from(experts.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "/automation",
      "/positions",
      "/backtest",
      "/execution/preflight",
      "/operations",
    ]);

    const learn = screen.getByRole("region", { name: "Learn" });
    const learnHrefs = Array.from(learn.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(learnHrefs).toEqual([
      "/welcome",
      "/learn/how-it-works",
      "/learn/about",
      "/learn/statistics",
      "/learn/onboarding",
    ]);
    expect(screen.queryByRole("link", { name: /Daily history|Journal/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Settings/ })).toBeNull();
  });

  it("links expert open deals under For experts", () => {
    render(
      <MemoryRouter>
        <MorePage />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /My open deals/ }).getAttribute("href")).toBe(
      "/positions"
    );
  });

  it("links Onboarding under Learn", () => {
    render(
      <MemoryRouter>
        <MorePage />
      </MemoryRouter>
    );
    const learn = screen.getByRole("region", { name: "Learn" });
    expect(
      Array.from(learn.querySelectorAll("a"))
        .find((a) => /^Onboarding/.test(a.textContent ?? ""))
        ?.getAttribute("href")
    ).toBe("/learn/onboarding");
  });
});
