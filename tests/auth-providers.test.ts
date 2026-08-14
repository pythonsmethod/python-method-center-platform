import { describe, expect, it } from "vitest";
import {
  enabledSocialProviders,
  isSocialProvider,
  oauthRedirectTo
} from "@/lib/auth/providers";
import { getDictionary } from "@/lib/i18n/dictionaries";

// Signing in with Google or Apple.
//
// The failure this guards against is not a broken login — it is an offer
// the site cannot keep. A "Continue with Google" button on a site where
// Google was never configured sends the person to somebody else's error
// page, and they conclude the platform is broken. So the button exists only
// when the switch says the setup on the other side is finished.

describe("which doors are open", () => {
  it("offers nothing until something is configured", () => {
    expect(enabledSocialProviders(undefined)).toEqual([]);
    expect(enabledSocialProviders("")).toEqual([]);
    expect(enabledSocialProviders("   ")).toEqual([]);
  });

  it("opens exactly what was named", () => {
    expect(enabledSocialProviders("google")).toEqual(["google"]);
    expect(enabledSocialProviders("google,apple")).toEqual(["google", "apple"]);
  });

  it("ignores names it does not know", () => {
    // A typo must not become a button.
    expect(enabledSocialProviders("gogle, facebook")).toEqual([]);
    expect(enabledSocialProviders("google, vk")).toEqual(["google"]);
  });

  it("survives the way a person actually types an env var", () => {
    expect(enabledSocialProviders(" GOOGLE , Apple ")).toEqual([
      "google",
      "apple"
    ]);
  });

  it("keeps the buttons in a fixed order however the variable is written", () => {
    // Otherwise editing the variable silently reorders the sign-in screen.
    expect(enabledSocialProviders("apple,google")).toEqual(["google", "apple"]);
  });

  it("recognises only real providers", () => {
    expect(isSocialProvider("google")).toBe(true);
    expect(isSocialProvider("apple")).toBe(true);

    for (const nonsense of ["facebook", "", null, undefined, 7, "GOOGLE"]) {
      expect(isSocialProvider(nonsense)).toBe(false);
    }
  });
});

describe("the address the provider sends the person back to", () => {
  it("returns them to where they were going", () => {
    expect(oauthRedirectTo("https://pythonmethodcenter.com", "/cabinet/sleep")).toBe(
      "https://pythonmethodcenter.com/auth/callback?next=%2Fcabinet%2Fsleep"
    );
  });

  it("refuses to carry an address off this site", () => {
    // This value travels to another company and comes back as a redirect.
    // An open redirect is precisely what someone would look for here.
    expect(oauthRedirectTo("https://x.com", "//evil.example")).toContain(
      "next=%2Fcabinet"
    );
    expect(oauthRedirectTo("https://x.com", "https://evil.example")).toContain(
      "next=%2Fcabinet"
    );
    expect(oauthRedirectTo("https://x.com", "")).toContain("next=%2Fcabinet");
  });

  it("does not double the slash when the origin carries one", () => {
    expect(oauthRedirectTo("https://x.com/", "/cabinet")).toBe(
      "https://x.com/auth/callback?next=%2Fcabinet"
    );
  });
});

describe("what the sign-in screen says about it", () => {
  it("explains what the provider hands over, in both languages", () => {
    // People hesitate at these buttons for one reason: they do not know
    // what the other company gets. Saying it is the whole job of the line.
    const ru = getDictionary("ru").login;
    const en = getDictionary("en").login;

    expect(ru.socialHint).toContain("email");
    expect(ru.socialHint).toContain("нет");
    expect(en.socialHint).toContain("no access");
  });

  it("offers the way out for someone with no account", () => {
    expect(getDictionary("ru").login.enrollNow).toBeTruthy();
    expect(getDictionary("en").login.enrollNow).toBeTruthy();
  });
});
