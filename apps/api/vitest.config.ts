// ============================================================
// Vitest Configuration — NestJS API Tests
// ============================================================
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    root: ".",
    include: ["__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    testTimeout: 15000,
    hookTimeout: 15000,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
