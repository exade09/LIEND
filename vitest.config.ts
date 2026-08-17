import path from "node:path"
import { defineConfig } from "vitest/config"

/**
 * Root test config. Aliases mirror each workspace's tsconfig `paths` so the
 * whole suite can also be run from the repository root.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@/": `${path.resolve(import.meta.dirname, "apps/extension/src")}/`,
    },
  },
})
