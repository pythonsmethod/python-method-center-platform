import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("English payment return language", () => {
  it("keeps English for subsequent authenticated pages without an /en twin", async () => {
    const request = new NextRequest(
      "https://preview.example.test/en/payment/success?session_id=cs_test_synthetic123456",
      { headers: { cookie: "pm-locale=ru" } }
    );
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toContain("/payment/success");
    expect(response.cookies.get("pm-locale")?.value).toBe("en");
    expect(response.cookies.get("pm-locale")?.path).toBe("/");
    expect(response.cookies.get("pm-locale")?.sameSite).toBe("lax");
  });
});
