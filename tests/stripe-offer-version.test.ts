import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OFFER_VERSION } from "@/lib/legal/offer";

describe("Stripe payment offer provenance", () => {
  it("records the canonical offer version on every new webhook payment", () => {
    const source = readFileSync(
      join(process.cwd(), "app/api/stripe/webhook/route.ts"),
      "utf8"
    );

    expect(OFFER_VERSION).toMatch(/^oferta-v\d+$/);
    expect(source).toContain('import { OFFER_VERSION } from "@/lib/legal/offer"');
    expect(source).toContain("offer_version: OFFER_VERSION");
  });
});
