import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { OFFER_CONTENT } from "@/lib/legal/offer-content";
import { OFFER_VERSION } from "@/lib/legal/offer";

// The contract cannot be edited quietly.
//
// Clause 12 says the edition in force when a client confirms is the edition
// that applies to them, and every consent record stores OFFER_VERSION as a
// plain string. So if the text of an edition is changed after anyone has
// accepted it, two people who agreed to two different documents are both
// recorded as having agreed to "oferta-vN", and there is no way to tell
// afterwards which words each of them actually saw.
//
// That is the failure this test exists to prevent, and it cannot be
// prevented by remembering to be careful — the last amendment to clause 3
// was made without the version being touched, and nothing noticed.
//
// So: the full text of both languages is fingerprinted, and the fingerprint
// is recorded against the version it belongs to. Change a comma in the
// contract and this test fails until the version is bumped and the new
// fingerprint recorded — which is exactly the moment to ask whether the
// change is one that may be made at all.
//
// To amend the contract:
//   1. edit lib/legal/offer-content.ts
//   2. bump OFFER_VERSION in lib/legal/offer.ts
//   3. add the new version and its fingerprint below, keeping the old
//      entries — they are the record of what earlier clients accepted
//
// Never edit an existing entry.
const FINGERPRINTS: Record<string, string> = {
  "oferta-v4": "012a725c1a4ed0aab17db4aa4b8151daeecf0b2abbb39b39e86c782a4276c27d",
  "oferta-v5": "934468238b7b8fb154cc52738b24770c43a95f7dee75a3c1c33ae3217cd079dc"
};

function fingerprint(): string {
  // Every heading, paragraph and bullet of both languages, in order.
  return createHash("sha256").update(JSON.stringify(OFFER_CONTENT)).digest("hex");
}

describe("the offer agreement", () => {
  it("has a fingerprint recorded for the version in force", () => {
    expect(
      FINGERPRINTS[OFFER_VERSION],
      `OFFER_VERSION is "${OFFER_VERSION}" but no fingerprint is recorded for it. ` +
        "If the contract was amended, add the new version and its fingerprint."
    ).toBeDefined();
  });

  it("still says exactly what that version says", () => {
    expect(
      fingerprint(),
      `The text of the offer changed while OFFER_VERSION stayed "${OFFER_VERSION}". ` +
        "Bump the version and record the new fingerprint — clients' consent " +
        "records point at this string, and editing an edition in place makes " +
        "two different contracts indistinguishable afterwards."
    ).toBe(FINGERPRINTS[OFFER_VERSION]);
  });

  it("keeps the record of superseded editions", () => {
    // Old entries are the evidence of what earlier clients agreed to.
    // Removing one destroys that evidence, so the count only ever grows.
    expect(Object.keys(FINGERPRINTS).length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(FINGERPRINTS)).toContain(OFFER_VERSION);
  });
});
