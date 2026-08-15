import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("assistant answer completion", () => {
  it("continues Claude answers that hit the token ceiling", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "lib", "assistant", "claude.ts"),
      "utf8"
    );

    expect(source).toContain('response.stop_reason === "max_tokens"');
    expect(source).toContain('{ role: "assistant", content: reply }');
    expect(source).toContain("CONTINUE_INSTRUCTION");
  });

  it("continues OpenAI answers that hit the token ceiling", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "lib", "assistant", "openai.ts"),
      "utf8"
    );

    expect(source).toContain('finish_reason === "length"');
    expect(source).toContain('{ role: "assistant", content: reply }');
    expect(source).toContain("CONTINUE_INSTRUCTION");
  });
});
