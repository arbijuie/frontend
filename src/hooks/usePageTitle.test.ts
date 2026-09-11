import { renderHook } from "@testing-library/react";
import { usePageTitle } from "./usePageTitle";

describe("usePageTitle", () => {
  it("sets the document title for the section and restores it on unmount", () => {
    document.title = "Before";
    const { rerender, unmount } = renderHook(({ section }) => usePageTitle(section), {
      initialProps: { section: "Backtest" },
    });
    expect(document.title).toBe("Backtest · Arbijuie");

    rerender({ section: "Execution" });
    expect(document.title).toBe("Execution · Arbijuie");

    unmount();
    expect(document.title).toBe("Before");
  });
});
