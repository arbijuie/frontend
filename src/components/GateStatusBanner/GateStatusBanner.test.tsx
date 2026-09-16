import { render, screen } from "@testing-library/react";
import GateStatusBanner from "./GateStatusBanner";

describe("GateStatusBanner", () => {
  it("shows the bound strategy and lock id when passed with a strategy", () => {
    render(
      <GateStatusBanner
        gate={{
          passed: true,
          strategy_id: "baseline-v1",
          lock_id: "abc-123",
          reason: null,
          strategy_profile_id: "baseline-v1",
        }}
      />
    );
    expect(screen.getByText(/strategy baseline-v1 is cleared/i)).not.toBeNull();
    expect(screen.getByText(/abc-123/)).not.toBeNull();
  });

  it("shows the unbound message when passed with no strategy", () => {
    render(
      <GateStatusBanner
        gate={{
          passed: true,
          strategy_id: null,
          lock_id: null,
          reason: null,
          strategy_profile_id: null,
        }}
      />
    );
    expect(screen.getByText(/no strategy is currently bound/i)).not.toBeNull();
  });

  it("shows the reason when the gate failed", () => {
    render(
      <GateStatusBanner
        gate={{
          passed: false,
          reason: "No passing strategy lock yet",
          strategy_id: null,
          lock_id: null,
          strategy_profile_id: null,
        }}
      />
    );
    expect(screen.getByText("No passing strategy lock yet")).not.toBeNull();
  });
});
