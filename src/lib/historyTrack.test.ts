import { advanceTrack, canGoForward, initialTrack } from "./historyTrack";

describe("historyTrack", () => {
  it("starts at position 0 with nothing to go forward to", () => {
    const track = initialTrack("a");
    expect(track.index).toBe(0);
    expect(canGoForward(track)).toBe(false);
  });

  it("moves forward on PUSH", () => {
    const track = advanceTrack(initialTrack("a"), "PUSH", "b");
    expect(track.index).toBe(1);
    expect(track.keys).toEqual(["a", "b"]);
    expect(canGoForward(track)).toBe(false);
  });

  it("allows going forward after going back with POP", () => {
    const pushed = advanceTrack(advanceTrack(initialTrack("a"), "PUSH", "b"), "PUSH", "c");
    const back = advanceTrack(pushed, "POP", "b");
    expect(back.index).toBe(1);
    expect(canGoForward(back)).toBe(true);
    const forward = advanceTrack(back, "POP", "c");
    expect(forward.index).toBe(2);
    expect(canGoForward(forward)).toBe(false);
  });

  it("drops the forward entries when a new page is pushed after going back", () => {
    const pushed = advanceTrack(advanceTrack(initialTrack("a"), "PUSH", "b"), "PUSH", "c");
    const back = advanceTrack(pushed, "POP", "a");
    const next = advanceTrack(back, "PUSH", "d");
    expect(next.keys).toEqual(["a", "d"]);
    expect(canGoForward(next)).toBe(false);
  });

  it("replaces the current entry on REPLACE and keeps the forward entries", () => {
    const pushed = advanceTrack(advanceTrack(initialTrack("a"), "PUSH", "b"), "PUSH", "c");
    const back = advanceTrack(pushed, "POP", "b");
    const replaced = advanceTrack(back, "REPLACE", "x");
    expect(replaced.keys).toEqual(["a", "x", "c"]);
    expect(replaced.index).toBe(1);
    expect(canGoForward(replaced)).toBe(true);
  });

  it("starts again when POP lands on an entry the app has not seen", () => {
    const pushed = advanceTrack(initialTrack("a"), "PUSH", "b");
    const lost = advanceTrack(pushed, "POP", "unknown");
    expect(lost).toEqual({ keys: ["unknown"], index: 0 });
  });

  it("returns the same object when the key did not change", () => {
    const track = initialTrack("a");
    expect(advanceTrack(track, "PUSH", "a")).toBe(track);
  });
});
