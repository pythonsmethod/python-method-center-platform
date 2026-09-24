import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";

// A visitor who opened the English site from a link and then pressed
// "Sign up" used to get the registration form in Russian: /login has one
// address and reads the language from a cookie that only the EN switch set.
function request(path: string, cookie?: string) {
  const headers = new Headers({ host: "pythonmethodcenter.com" });
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(new URL(path, "https://pythonmethodcenter.com"), { headers });
}

function localeCookie(response: Response) {
  const header = response.headers.get("set-cookie") ?? "";
  const match = header.match(new RegExp(`${LOCALE_COOKIE}=([a-z]+)`));
  return { value: match?.[1] ?? null, header };
}

describe("an English address remembers English", () => {
  it.each(["/en", "/en/payment", "/en/support"])("sets the language cookie on %s", async (path) => {
    const response = await middleware(request(path));
    const cookie = localeCookie(response);
    expect(cookie.value).toBe("en");
    expect(cookie.header).toContain("Path=/");
    expect(cookie.header.toLowerCase()).toContain("domain=pythonmethodcenter.com");
  });

  it("does not rewrite the cookie when English is already chosen", async () => {
    const response = await middleware(request("/en", `${LOCALE_COOKIE}=en`));
    expect(localeCookie(response).value).toBeNull();
  });

  it.each([
    ["/en/login?mode=signup", "/login?mode=signup"],
    ["/en/login", "/login"],
    ["/en/recovery", "/recovery"],
    ["/en/cabinet", "/cabinet"],
    ["/en/welcome", "/welcome"]
  ])("sends %s to its single address in English", async (from, to) => {
    const response = await middleware(request(from));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(`${location.pathname}${location.search}`).toBe(to);
    expect(localeCookie(response).value).toBe("en");
  });

  it("leaves a Russian address and its visitor alone", async () => {
    const response = await middleware(request("/login"));
    expect(response.status).toBe(200);
    expect(localeCookie(response).value).toBeNull();
  });
});
