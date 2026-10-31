import { plainCode, plainReason, plainReasons } from "./plainReasons";

describe("plainReasons", () => {
  it("translates the missing fee code", () => {
    expect(plainReason({ code: "venue_fee_source_not_integrated", message: "raw" })).toBe(
      "Real fee data is missing for this exchange"
    );
  });

  it("translates trading disabled", () => {
    expect(plainReason({ code: "execution_disabled", message: "raw" })).toBe(
      "Trading is turned off in settings"
    );
  });

  it("falls back to the server message for unknown codes", () => {
    expect(plainReason({ code: "something_new", message: "Server text" })).toBe("Server text");
  });

  it("removes duplicate texts", () => {
    expect(
      plainReasons([
        { code: "venue_fee_source_not_integrated", message: "a" },
        { code: "real_fee_unavailable", message: "b" },
      ])
    ).toHaveLength(1);
  });
});

describe("plainCode", () => {
  it("uses the dictionary for known codes", () => {
    expect(plainCode("execution_disabled")).toBe("Trading is turned off in settings");
  });
  it("turns unknown snake_case codes into words", () => {
    expect(plainCode("acceptance_evidence_missing")).toBe("Acceptance evidence missing");
  });
  it("returns empty text for missing codes", () => {
    expect(plainCode(null)).toBe("");
  });
});
