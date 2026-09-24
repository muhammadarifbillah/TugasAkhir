import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      // Report on the pure logic layer. UI (React) and API routes need a live
      // DB/Docker and are exercised manually, so including them would understate
      // the coverage of the code that unit tests can actually reach.
      include: ["src/lib/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/generated/**"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
