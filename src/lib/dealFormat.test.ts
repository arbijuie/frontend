import { bpsToPercent, dealPath, estimateDeal, formatPayoff, formatUsd } from "./dealFormat";

describe("dealFormat", () => {
  it("shows bps as percent", () => {
    expect(bpsToPercent(15)).toBe("0.15%");
  });
  it("shows pay-off in hours under 2 days, otherwise days", () => {
    expect(formatPayoff(5.4)).toBe("5 h");
    expect(formatPayoff(72)).toBe("3 days");
    expect(formatPayoff(null)).toBe("Unknown");
  });
  it("builds one address per deal", () => {
    const legs = [
      { side: "long", venue: "binance" },
      { side: "short", venue: "lighter" },
    ] as never;
    expect(dealPath({ symbol: "1000PEPE", legs })).toBe("/deals/1000PEPE/binance/lighter");
  });
  it("estimates $1,000 at 18.25%/year with 0.20% costs", () => {
    const e = estimateDeal(1000, { funding_diff_apr: 18.25, total_cost_bps: 20 });
    expect(e.incomePerDay).toBeCloseTo(0.5);
    expect(e.costs).toBeCloseTo(2);
    expect(e.after7Days).toBeCloseTo(1.5);
    expect(e.after30Days).toBeCloseTo(13);
  });
  it("treats an empty or negative size as zero", () => {
    expect(estimateDeal(-5, { funding_diff_apr: 10, total_cost_bps: 10 }).costs).toBe(0);
  });
  it("formats dollars with a real minus sign", () => {
    expect(formatUsd(-1.5)).toBe("−$1.50");
  });
});
