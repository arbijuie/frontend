import { defineConfig, devices } from "@playwright/test";

const browserChannel = process.env.PW_BROWSER_CHANNEL;
const localFallbackEnabled = process.env.PW_E2E_LOCAL_FALLBACK === "1";
const localFallbackChannel = process.env.PW_E2E_LOCAL_FALLBACK_CHANNEL ?? "msedge";

const effectiveChannel = localFallbackEnabled ? localFallbackChannel : browserChannel;
const channelOverride = effectiveChannel ? { channel: effectiveChannel } : {};

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "corepack pnpm exec vite --config config/vite.config.ts --host 127.0.0.1 --port 4173",
    port: 4173,
    timeout: 120_000,
    reuseExistingServer: true,
    env: {
      VITE_ARB_API_URL: "http://127.0.0.1:8000",
      VITE_ARB_API_TOKEN: "",
    },
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], ...channelOverride },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"], ...channelOverride },
    },
  ],
});
