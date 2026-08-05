import { describe, expect, it } from "vitest";
import { localeCookieDomain } from "@/lib/i18n/cookie-domain";

// The language switch was reported as not working on the live site, and it
// works on every machine we can test on. The difference between those two
// places is the host name.
//
// A cookie written by a script is scoped to the exact host it was written
// on. If the site answers on both pythonmethodcenter.com and
// www.pythonmethodcenter.com — and a redirect between them is invisible to
// the person clicking — then the choice is stored under one name and read
// under the other, and the button appears to do nothing at all.
//
// The choice is now written by the server with a domain wide enough to
// cover both. The rule for widening is the dangerous part: a cookie whose
// domain is a public suffix is silently dropped by the browser, which would
// produce exactly the bug being fixed, only everywhere instead of
// sometimes.

describe("which hosts one language choice covers", () => {
  it("shares the choice between the apex and www", () => {
    expect(localeCookieDomain("pythonmethodcenter.com")).toBe("pythonmethodcenter.com");
    expect(localeCookieDomain("www.pythonmethodcenter.com")).toBe(
      "pythonmethodcenter.com"
    );
  });

  it("never widens a preview deployment onto its public suffix", () => {
    // "vercel.app" is a public suffix. A cookie set for it is dropped, and
    // the language would stop switching on every preview at once.
    expect(localeCookieDomain("python-method-abc123.vercel.app")).toBeUndefined();
    expect(localeCookieDomain("www.python-method-abc123.vercel.app")).toBe(
      "python-method-abc123.vercel.app"
    );
  });

  it("leaves local development host-scoped", () => {
    expect(localeCookieDomain("localhost:3000")).toBeUndefined();
    expect(localeCookieDomain("127.0.0.1:3000")).toBeUndefined();
  });

  it("ignores the port and the case of the host", () => {
    expect(localeCookieDomain("PythonMethodCenter.COM:443")).toBe(
      "pythonmethodcenter.com"
    );
  });

  it("survives a missing host header instead of throwing", () => {
    expect(localeCookieDomain("")).toBeUndefined();
  });
});
