import { getBackoffDelayMs, shouldGiveUp } from "./wsBackoff";

describe("getBackoffDelayMs", () => {
  it("doubles the delay each attempt", () => {
    expect(getBackoffDelayMs(0)).toBe(1000);
    expect(getBackoffDelayMs(1)).toBe(2000);
    expect(getBackoffDelayMs(2)).toBe(4000);
    expect(getBackoffDelayMs(3)).toBe(8000);
  });

  it("caps the delay at 30 seconds", () => {
    expect(getBackoffDelayMs(10)).toBe(30000);
  });
});

describe("shouldGiveUp", () => {
  it("returns false before the attempt limit", () => {
    expect(shouldGiveUp(0)).toBe(false);
    expect(shouldGiveUp(4)).toBe(false);
  });

  it("returns true at and after the attempt limit", () => {
    expect(shouldGiveUp(5)).toBe(true);
    expect(shouldGiveUp(6)).toBe(true);
  });
});
