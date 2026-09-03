import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/setup/global-setup.ts"],
    setupFiles: ["./tests/setup/env.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // Integration tests share one ephemeral database and reset it
    // between tests — run test files serially to keep that deterministic
    // instead of parallelizing across processes.
    fileParallelism: false,
  },
});
