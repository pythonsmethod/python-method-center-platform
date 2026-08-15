import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("browser security headers", () => {
  it("protects every route with the baseline browser policies", () => {
    const config = readFileSync("next.config.mjs", "utf8");

    expect(config).toContain('source: "/(.*)"');
    expect(config).toContain('{ key: "X-Content-Type-Options", value: "nosniff" }');
    expect(config).toContain('{ key: "X-Frame-Options", value: "DENY" }');
    expect(config).toContain(
      '{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }'
    );
    expect(config).toContain(
      'value: "camera=(), geolocation=(), microphone=(self)"'
    );
  });
});
