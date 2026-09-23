import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("assistant answer completion", () => {
  it("gives signed-in conversations enough room for a complete first answer", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app", "api", "assistant", "client", "route.ts"),
      "utf8"
    );

    expect(source).toContain('registered: { provider: "claude", maxTokens: 1400');
    expect(source).toContain('client: { provider: "best", maxTokens: 1800');
  });

  // Completion and failure behavior are exercised in assistant-api-contract.test.ts.
});
