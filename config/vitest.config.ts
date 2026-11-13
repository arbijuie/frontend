import { defineConfig, type ViteUserConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: react() as ViteUserConfig["plugins"],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // Operator-risk surfaces (issue #670), grown deliberately rather than the whole repo: the
      // thresholds below are global over this list, so a new entry must arrive with its tests.
      include: [
        "src/components/PipelineDiagnosticsHint/PipelineDiagnosticsHint.tsx",
        "src/hooks/useTransientFlag.ts",
        // Health stop-trading latch and manual acknowledgment (issue #669).
        "src/api/stop-trading.ts",
        "src/hooks/useStopTrading.ts",
        "src/lib/stopTrading.ts",
        "src/components/StopTradingCard/StopTradingCard.tsx",
        // Operator auth gate: Telegram session bootstrap and the session header (issue #672).
        "src/api/config.ts",
        "src/api/telegram-session.ts",
        "src/components/OperatorSessionGate/OperatorSessionGate.tsx",
        // Trading open gate behind the Open position buttons on Deals and the deal page.
        "src/lib/tradingOpenGate.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 90,
        branches: 75,
        statements: 80,
      },
    },
  },
});
