import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative asset paths so the build works from any sub-path (e.g. GitHub Pages).
  base: "./",
  server: {
    // The tracker, exercise library and card copy are shared with the desktop
    // app and live one level up in ../src.
    fs: { allow: [".."] },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
