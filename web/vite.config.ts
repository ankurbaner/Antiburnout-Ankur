import { fileURLToPath } from "node:url";
import { searchForWorkspaceRoot } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative asset paths so the build works from any sub-path (e.g. GitHub Pages).
  base: "./",
  server: {
    // The tracker, exercise library and card copy are shared with the desktop
    // app in ../src; allow only that directory beyond the web root.
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), fileURLToPath(new URL("../src", import.meta.url))],
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
