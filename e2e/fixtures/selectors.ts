import type { Page } from "@playwright/test";

/** MVP primary chrome after #665: Deals | Health | Settings | More. */
export const PRIMARY_NAV_LABELS = ["Deals", "Health", "Settings", "More"] as const;

export function primaryNav(page: Page) {
  return page.getByRole("navigation", { name: "Primary" });
}

export function primaryNavLink(page: Page, label: (typeof PRIMARY_NAV_LABELS)[number]) {
  return primaryNav(page).getByRole("link", { name: label, exact: true });
}

/** Aria-label pattern for Deal Open CTAs on opportunity cards. */
export function openTradeButton(
  page: Page,
  symbol: string,
  longVenue: string,
  shortVenue: string
) {
  return page.getByRole("button", {
    name: `Open trade for ${symbol}, ${longVenue} to ${shortVenue}`,
  });
}
