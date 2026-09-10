import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ resolve: { alias: { "@": path.resolve(__dirname, "..") } },
  test: { include: ["scripts/lifetime-memory-live.test.ts"], testTimeout: 120000, maxWorkers: 1 } });
