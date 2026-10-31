import { describe, expect, it } from "vitest";
import type { OpportunityItem } from "../api/types";
import { dealsSummary } from "./dealsSummary";

const item = (status: OpportunityItem["status"]) => ({ status }) as OpportunityItem;

describe("dealsSummary", () => {
  it("says plainly when no deal is ready", () => {
    expect(dealsSummary([item("watching"), item("blocked"), item("blocked")])).toBe(
      "No deals are ready to open right now. 1 on watch, 2 blocked."
    );
  });

  it("counts ready deals", () => {
    expect(dealsSummary([item("ready"), item("ready"), item("blocked")])).toBe(
      "2 deals are ready to open. 0 on watch, 1 blocked."
    );
  });
});
