import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";

// Registration comes before payment.
//
// A Stripe payment link is a public URL. While the pages handed it to
// anyone, a person could pay without ever having an account — and then
// there was no account to attach the money to. The webhook fell back to
// matching the payer's email, which fails the moment someone pays from a
// different address than they registered with, and the payment ended up as
// a Telegram message with nobody to give it to. That happened on the first
// day of the focus group.
//
// Signed in, the account id travels with the payment as client_reference_id
// and the match cannot fail. So both payment pages must decide from the
// session, not from anything else.

const PAGES = [
  { file: "app/(payment)/payment/page.tsx", next: "/payment" },
  { file: "app/(payment)/payment/test/page.tsx", next: "/payment/test" }
];

describe.each(PAGES)("$file", ({ file, next }) => {
  const source = readFileSync(path.join(process.cwd(), file), "utf8");

  it("decides from the session, not from a flag someone can forget", () => {
    expect(source).toContain("signedIn={Boolean(profileId)}");
    expect(source).toContain("await supabase.auth.getUser()");
  });

  it("sends a visitor back to this page after they register", () => {
    // Landing on the cabinet instead loses the person mid-purchase.
    expect(source).toContain(`signInHref="/login?mode=signup&next=${next}"`);
  });

  it("still attaches the account to the payment link", () => {
    // The whole reason for requiring an account: without this the payment
    // arrives with nothing but an email to identify it by.
    expect(source).toContain("client_reference_id");
  });
});

describe.each(["ru", "en"] as const)("what a visitor without an account reads in %s", (locale) => {
  const t = getDictionary(locale).payment;

  it("has a button and a reason, in their language", () => {
    expect(t.signInToPay.length).toBeGreaterThan(0);
    expect(t.signInWhy.length).toBeGreaterThan(0);
  });

  it("explains the benefit rather than stating a rule", () => {
    // "You must register" is a barrier. "It attaches to your cabinet and
    // access switches on by itself" is a reason, and it is also true.
    const expected = locale === "ru" ? "привязывается к вашему кабинету" : "attaches to your cabinet";

    expect(t.signInWhy).toContain(expected);
  });
});
