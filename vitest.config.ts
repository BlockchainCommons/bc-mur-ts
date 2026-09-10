import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // CLI suites shell out to an installed binary; they are not part of the
    // library's own test run (mirrors bc-dcbor-ts).
    exclude: ["tests/cli.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/index.ts"],
      // Raise-only floors. Seed from the first measured run; never lower.
      thresholds: {
        statements: 64,
        branches: 54,
        functions: 62,
        lines: 64,
      },
    },
  },
});
