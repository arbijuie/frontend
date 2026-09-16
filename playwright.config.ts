import { defineConfig, devices } from "@playwright/test";

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
      name: "edge-desktop",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
    {
      name: "edge-mobile",
      use: { ...devices["Pixel 7"], channel: "msedge" },
    },
  ],
});
