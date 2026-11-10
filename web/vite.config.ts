import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative asset paths so the build works from any sub-path (e.g. GitHub Pages).
  base: "./",
  plugins: [{
    name: "version-service-worker",
    apply: "build",
    writeBundle(output) {
      const worker = resolve(output.dir ?? "dist", "sw.js");
      writeFileSync(worker, readFileSync(worker, "utf8").replace("__BUILD_VERSION__", Date.now().toString(36)));
    },
  }],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
