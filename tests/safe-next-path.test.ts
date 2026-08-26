import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "@/lib/auth/safe-next-path";

describe("sanitizeNextPath", () => {
  it("keeps safe nested routes and query strings", () => {
    expect(sanitizeNextPath("/cabinet/documents?round=2")).toBe("/cabinet/documents?round=2");
  });

  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "/\t/evil.com"])(
    "rejects unsafe destination %s",
    (value) => expect(sanitizeNextPath(value)).toBe("/cabinet")
  );
});
