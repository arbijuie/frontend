import { describe, expect, it } from "vitest";
import { checkPrices } from "./priceCheck";

describe("checkPrices", () => {
  it("flags the live PRL case ($1.98 vs $0.087) as a different coin", () => {
    expect(checkPrices("1.98", "0.087").level).toBe("danger");
  });
  it("flags a gap above 20% as danger", () => {
    expect(checkPrices(100, 121).level).toBe("danger");
  });
  it("treats exactly 20% as a warning, not danger", () => {
    expect(checkPrices(100, 120).level).toBe("warning");
  });
  it("warns from a 2% gap", () => {
    expect(checkPrices(100, 102).level).toBe("warning");
  });
  it("is fine below 2%", () => {
    expect(checkPrices(100, 101.9).level).toBe("ok");
  });
  it("reads 1000x prices as a contract-size difference, not a wrong coin", () => {
    const r = checkPrices(0.0000123, 0.0123);
    expect(r.level).toBe("warning");
    expect(r.title).toBe("Prices use different contract sizes");
  });
  it("falls back to the basis when prices are missing", () => {
    expect(checkPrices(null, null, 18393).level).toBe("danger");
    expect(checkPrices(null, null, 250).level).toBe("warning");
    expect(checkPrices(null, null, 40).level).toBe("ok");
  });
  it("says nothing when there is no data", () => {
    expect(checkPrices(null, undefined).level).toBe("ok");
  });
  it("reports danger for a 1900 bps basis without prices", () => {
    expect(checkPrices(null, null, 1900).level).toBe("danger");
  });
  it("keeps a small basis ok without prices", () => {
    expect(checkPrices(null, null, 10).level).toBe("ok");
  });
  it("warns for a basis just under the danger threshold", () => {
    expect(checkPrices(null, null, 1700).level).toBe("warning");
    expect(checkPrices(null, null, 1818).level).toBe("warning");
    expect(checkPrices(null, null, 1820).level).toBe("danger");
  });
  it("ignores the sign of the basis", () => {
    expect(checkPrices(null, null, -1900).level).toBe("danger");
  });
  it("gives the same gap from the basis as from the prices for the same pair", () => {
    const basisBps = ((121 - 100) / ((100 + 121) / 2)) * 10_000;
    expect(checkPrices(100, 121).gap).toBeCloseTo(0.21, 10);
    expect(checkPrices(null, null, basisBps).gap).toBeCloseTo(0.21, 10);
  });
  it("prefers the prices over the basis when both are known", () => {
    expect(checkPrices(100, 100.5, 1900).level).toBe("ok");
  });
  it("handles an extreme basis without breaking", () => {
    expect(checkPrices(null, null, 50_000).level).toBe("danger");
  });
  it("uses the basis as the gap for cash and carry", () => {
    expect(checkPrices(null, null, 1000, "cash_and_carry").gap).toBeCloseTo(0.1, 10);
    expect(checkPrices(null, null, 1000, "cash_and_carry").level).toBe("warning");
  });
  it("keeps cash and carry under the limit a warning, not danger", () => {
    expect(checkPrices(null, null, 1820, "cash_and_carry").level).toBe("warning");
    expect(checkPrices(null, null, 2000, "cash_and_carry").level).toBe("warning");
  });
  it("flags a cash and carry basis above 20% as danger", () => {
    expect(checkPrices(null, null, 2100, "cash_and_carry").level).toBe("danger");
  });
  it("converts the basis for funding arbitrage", () => {
    expect(checkPrices(null, null, 1000, "funding_arbitrage").gap).toBeCloseTo(0.1053, 3);
  });
  it("converts the basis for basis convergence like funding arbitrage", () => {
    expect(checkPrices(null, null, 1000, "basis_convergence").gap).toBeCloseTo(0.1053, 3);
  });
});
