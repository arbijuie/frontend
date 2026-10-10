import {
  decodeUrlState,
  encodeUrlState,
  DEFAULT_URL_STATE,
  isDefaultState,
} from "./opportunitiesUrlState";

describe("decodeUrlState", () => {
  it("returns all defaults for empty params", () => {
    const params = new URLSearchParams();
    expect(decodeUrlState(params)).toEqual(DEFAULT_URL_STATE);
  });

  it("decodes valid sort/status/strategy/search values", () => {
    const params = new URLSearchParams(
      "sort=combined_score&status=ready&strategy=basis_convergence&q=aero"
    );
    expect(decodeUrlState(params)).toEqual({
      sortKey: "combined_score",
      statusFilter: "ready",
      strategyFilter: "basis_convergence",
      search: "aero",
    });
  });

  it("falls back to defaults for an invalid sort value", () => {
    const params = new URLSearchParams("sort=not-a-real-key");
    expect(decodeUrlState(params).sortKey).toBe(DEFAULT_URL_STATE.sortKey);
  });

  it("falls back to defaults for an invalid status value", () => {
    const params = new URLSearchParams("status=invalid-status");
    expect(decodeUrlState(params).statusFilter).toBe(DEFAULT_URL_STATE.statusFilter);
  });

  it("falls back to defaults for an invalid strategy value", () => {
    const params = new URLSearchParams("strategy=not-a-strategy");
    expect(decodeUrlState(params).strategyFilter).toBe(DEFAULT_URL_STATE.strategyFilter);
  });

  it("treats a missing search param as an empty string, not a missing-value error", () => {
    const params = new URLSearchParams("sort=priority");
    expect(decodeUrlState(params).search).toBe("");
  });

  it("preserves an empty-string search param explicitly set in the URL", () => {
    const params = new URLSearchParams("q=");
    expect(decodeUrlState(params).search).toBe("");
  });
});

describe("encodeUrlState", () => {
  it("produces empty params for the default state", () => {
    const params = encodeUrlState(DEFAULT_URL_STATE);
    expect(params.toString()).toBe("");
  });

  it("only includes params that differ from defaults", () => {
    const params = encodeUrlState({
      ...DEFAULT_URL_STATE,
      statusFilter: "ready",
    });
    expect(params.get("status")).toBe("ready");
    expect(params.has("sort")).toBe(false);
    expect(params.has("strategy")).toBe(false);
    expect(params.has("q")).toBe(false);
  });

  it("includes all four params when all differ from defaults", () => {
    const params = encodeUrlState({
      sortKey: "funding_diff_apr",
      statusFilter: "blocked",
      strategyFilter: "cash_and_carry",
      search: "doge",
    });
    expect(params.get("sort")).toBe("funding_diff_apr");
    expect(params.get("status")).toBe("blocked");
    expect(params.get("strategy")).toBe("cash_and_carry");
    expect(params.get("q")).toBe("doge");
  });

  it("round-trips through encode then decode back to the same state", () => {
    const original = {
      sortKey: "hours_to_breakeven" as const,
      statusFilter: "watching" as const,
      strategyFilter: "funding_arbitrage" as const,
      search: "btc",
    };
    const decoded = decodeUrlState(encodeUrlState(original));
    expect(decoded).toEqual(original);
  });
});

describe("encodeUrlState with baseParams", () => {
  it("preserves unrelated params not owned by this page", () => {
    const base = new URLSearchParams("utm_source=newsletter&debug=1");
    const params = encodeUrlState({ ...DEFAULT_URL_STATE, statusFilter: "ready" }, base);

    expect(params.get("utm_source")).toBe("newsletter");
    expect(params.get("debug")).toBe("1");
    expect(params.get("status")).toBe("ready");
  });

  it("removes a managed key when it reverts to default, without touching others", () => {
    const base = new URLSearchParams("utm_source=newsletter&status=ready");
    const params = encodeUrlState({ ...DEFAULT_URL_STATE }, base);

    expect(params.get("utm_source")).toBe("newsletter");
    expect(params.has("status")).toBe(false);
  });
});

describe("isDefaultState", () => {
  it("is true for the default state", () => {
    expect(isDefaultState(DEFAULT_URL_STATE)).toBe(true);
  });

  it("is true for a whitespace-only search, matching encodeUrlState's own rule", () => {
    expect(isDefaultState({ ...DEFAULT_URL_STATE, search: "   " })).toBe(true);
  });

  it("is false when any field differs from default", () => {
    expect(isDefaultState({ ...DEFAULT_URL_STATE, statusFilter: "ready" })).toBe(false);
  });
});
