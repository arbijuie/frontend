import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HowItWorksPage from "./HowItWorksPage";
import { COST_ITEMS, PIPELINE_STEPS, VERDICTS } from "../../lib/howItWorks";

describe("HowItWorksPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("explains the pipeline, verdicts, and costs without calling the API", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<HowItWorksPage />);

    expect(screen.getByRole("heading", { level: 1, name: "How it works" })).toBeTruthy();
    const steps = screen.getByRole("list", { name: "Screener pipeline" });
    expect(steps.querySelectorAll("li")).toHaveLength(PIPELINE_STEPS.length);
    expect(steps?.textContent ?? "").toContain("Ingest");
    const verdicts = screen.getByRole("list", { name: "Route verdicts" });
    expect(verdicts.querySelectorAll("li")).toHaveLength(VERDICTS.length);
    expect(verdicts?.textContent ?? "").toContain("READY");
    expect(verdicts?.textContent ?? "").toContain("BLOCKED");
    expect(
      screen.getByRole("list", { name: "Costs deducted from the edge" }).querySelectorAll("li")
    ).toHaveLength(COST_ITEMS.length);
    expect(screen.getByText(/read-only by default/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/will appear here/)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.title).toBe("How it works · Arbijuie");
  });
});
