import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./fixtures/mockApi";

// Supported viewport targets (issues #202 and #378): phone 390px and tablet 768px.
// Desktop widths are covered by every other spec through the chromium-desktop project.
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
] as const;

interface PageCase {
  path: string;
  heading: string;
  surface: "operator" | "public";
  ready?: (page: Page) => Promise<void>;
}

const PAGES: PageCase[] = [
  {
    path: "/",
    heading: "Opportunities",
    surface: "operator",
    ready: async (page) => {
      await expect(page.getByText("AERO").first()).toBeVisible();
    },
  },
  {
    path: "/status",
    heading: "Status",
    surface: "operator",
    ready: async (page) => {
      await expect(page.getByRole("heading", { name: "Live Transport" })).toBeVisible();
    },
  },
  {
    path: "/config",
    heading: "Config",
    surface: "operator",
    ready: async (page) => {
      await expect(page.getByRole("heading", { name: "Custom Runbook Fields" })).toBeVisible();
    },
  },
  {
    path: "/backtest",
    heading: "Backtest",
    surface: "operator",
    ready: async (page) => {
      await expect(page.getByText("Total Snapshots")).toBeVisible();
    },
  },
  { path: "/execution/preflight", heading: "Execution Preflight", surface: "operator" },
  { path: "/automation", heading: "Automation", surface: "operator" },
  { path: "/product", heading: "Product", surface: "public" },
  { path: "/how-it-works", heading: "How it works", surface: "public" },
  { path: "/statistics", heading: "Statistics", surface: "public" },
  { path: "/journal", heading: "Journal", surface: "public" },
  { path: "/onboarding", heading: "Onboarding", surface: "public" },
];

interface Overflow {
  element: string;
  left: number;
  right: number;
}

/**
 * Elements whose box leaves the viewport horizontally. Content inside its own horizontal
 * scroll or clip container (wide tables, tab strips) is allowed to be wider than the page.
 */
async function findHorizontalOverflow(page: Page): Promise<{
  scrollWidth: number;
  viewportWidth: number;
  offenders: Overflow[];
}> {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const clipsX = (element: Element) => {
      const overflowX = getComputedStyle(element).overflowX;
      return overflowX !== "visible";
    };
    const insideClipContainer = (element: Element) => {
      for (let node = element.parentElement; node && node !== document.body;) {
        if (clipsX(node)) return true;
        node = node.parentElement;
      }
      return false;
    };
    const describe = (element: Element) => {
      const id = element.id ? `#${element.id}` : "";
      const classes = [...element.classList].map((name) => `.${name}`).join("");
      const text = (element.textContent ?? "").trim().slice(0, 40);
      return `${element.tagName.toLowerCase()}${id}${classes} "${text}"`;
    };

    const offenders: Overflow[] = [];
    for (const element of document.body.querySelectorAll("*")) {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right <= viewportWidth + 1 && rect.left >= -1) continue;
      if (insideClipContainer(element)) continue;
      offenders.push({
        element: describe(element),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
      });
    }

    return {
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      viewportWidth,
      offenders: offenders.slice(0, 10),
    };
  });
}

test.describe("Responsive layout", () => {
  // Each test sets its own viewport, so one browser project is enough.
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "viewports are set explicitly; run once"
    );
    await mockApi(page);
  });

  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} ${viewport.width}px`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      for (const { path, heading, surface, ready } of PAGES) {
        test(`${path}: no horizontal overflow and navigation within reach`, async ({ page }) => {
          await page.goto(path);
          await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
          await ready?.(page);

          const result = await findHorizontalOverflow(page);
          expect(result.offenders, `elements wider than ${viewport.width}px`).toEqual([]);
          expect(result.scrollWidth).toBeLessThanOrEqual(result.viewportWidth);

          // The page title and the surface navigation are on screen without scrolling.
          await expect(page.getByRole("heading", { level: 1, name: heading })).toBeInViewport();
          const nav = page.getByRole("navigation", {
            name: surface === "operator" ? "Primary" : "Public",
          });
          await expect(nav).toBeInViewport();
          for (const link of await nav.getByRole("link").all()) {
            await expect(link).toBeInViewport();
          }
        });
      }

      test("Opportunities: filters and status tabs are above the fold", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByText("AERO").first()).toBeVisible();
        await expect(page.getByLabel("Filter opportunities by strategy")).toBeInViewport();
        await expect(
          page.getByRole("group", { name: "Filter opportunities by status" })
        ).toBeInViewport();
      });
    });
  }
});
