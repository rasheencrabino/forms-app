import { defineConfig } from "vitest/config";

// Unit tests cover pure helpers in src/lib only; no DOM or React rendering.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
