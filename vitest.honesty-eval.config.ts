import { defineConfig } from "vitest/config";
import base from "./vitest.config";

// Never included in the ordinary offline regression suite.
// mergeConfig concatenates include arrays and would rerun all offline tests.
export default defineConfig({ ...base, test: { ...base.test,
  include: ["scripts/assistant-honesty.eval.ts"],
  testTimeout: 180_000,
  fileParallelism: false
} });
