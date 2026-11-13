import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const variablesPath = path
  .resolve(import.meta.dirname, "../src/styles/variables")
  .replace(/\\/g, "/");

export default defineConfig({
  plugins: [react()],
  build: {
    // Current operator/public shell ships as a single entrypoint chunk around ~590 kB minified.
    // Keep warning visibility for real regressions while avoiding noise below current baseline.
    chunkSizeWarningLimit: 650,
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "${variablesPath}" as v;\n`,
      },
    },
  },
});
