import { fireEvent, render, screen } from "@testing-library/react";
import SkipLink from "./SkipLink";
import { MAIN_CONTENT_ID } from "../../lib/landmarks";

describe("SkipLink", () => {
  it("links to the main content landmark", () => {
    render(<SkipLink />);

    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link.getAttribute("href")).toBe(`#${MAIN_CONTENT_ID}`);
  });

  it("moves focus to the main landmark without changing the URL", () => {
    render(
      <>
        <SkipLink />
        <main id={MAIN_CONTENT_ID} tabIndex={-1}>
          content
        </main>
      </>
    );

    fireEvent.click(screen.getByRole("link", { name: "Skip to main content" }));

    expect(document.activeElement).toBe(screen.getByRole("main"));
    expect(window.location.hash).toBe("");
  });
});
