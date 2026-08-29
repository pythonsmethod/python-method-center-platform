import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { SITE_URL } from "@/lib/config/site";
import {
  LOCALE_COOKIE,
  LOCALE_HEADER,
  PATH_HEADER
} from "@/lib/i18n/locale";
import {
  hasEnglishTwin,
  localizedHref,
  readLocaleFromPath
} from "@/lib/i18n/routing";

const REFERRAL_COOKIE = "pm-ref";
const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

// A visitor arriving with ?ref=CODE is remembered until they register, so
// attribution survives reading the site, closing the tab and coming back.
function captureReferral(request: NextRequest, response: NextResponse): void {
  const code = request.nextUrl.searchParams.get("ref");

  if (!code || code.length > 32) {
    return;
  }

  // First touch wins: an existing attribution is never overwritten.
  if (request.cookies.get(REFERRAL_COOKIE)) {
    return;
  }

  response.cookies.set(REFERRAL_COOKIE, code, {
    maxAge: REFERRAL_COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/"
  });
}

// Which language this address asks for, and what to do about it.
//
// Russian is served from the bare paths it has always used. English lives
// under /en, and the middleware turns /en/payment back into /payment before
// the application sees it, carrying the language in a request header — so
// there is one copy of every page, not two.
//
// A visitor who has pressed EN is moved from a Russian address to its
// English twin. Nobody is moved on the strength of Accept-Language alone:
// a crawler arrives with all sorts of language headers, and redirecting it
// away from an address is how versions of a site stop being seen.
function resolveLanguageRouting(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const { locale, path } = readLocaleFromPath(pathname);

  if (locale === "en") {
    // /en/cabinet and the like have no English twin, so there is nothing to
    // rewrite them to. They are simply not addresses on this site.
    if (!hasEnglishTwin(path)) {
      return null;
    }

    const target = request.nextUrl.clone();
    target.pathname = path;

    const headers = new Headers(request.headers);
    headers.set(LOCALE_HEADER, "en");
    headers.set(PATH_HEADER, path);

    return NextResponse.rewrite(target, { request: { headers } });
  }

  const chosen = request.cookies.get(LOCALE_COOKIE)?.value;

  if (chosen === "en" && hasEnglishTwin(path)) {
    const target = request.nextUrl.clone();
    target.pathname = localizedHref(path, "en");
    return NextResponse.redirect(target, 307);
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const canonicalOrigin = new URL(SITE_URL);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost || request.nextUrl.host;
  const alternateHost = `www.${canonicalOrigin.host}`;

  // All historical http/www variants collapse to the single origin used by
  // canonical tags and the sitemap. Keeping the path and query preserves old
  // bookmarks while preventing Google from treating the old host as another
  // copy of the site.
  if (requestHost.toLowerCase() === alternateHost.toLowerCase()) {
    const destination = request.nextUrl.clone();
    destination.protocol = canonicalOrigin.protocol;
    destination.host = canonicalOrigin.host;
    return NextResponse.redirect(destination, 308);
  }

  const language = resolveLanguageRouting(request);

  if (language) {
    // A rewrite still has to carry the referral cookie and, on the English
    // side, the same session handling as everywhere else — but /en only
    // covers public pages, where there is no session to refresh.
    captureReferral(request, language);
    return language;
  }

  // Carried on every response built below: the Supabase handler rebuilds
  // the response object when it refreshes a session, and a header set only
  // on the first one would be lost at exactly that point.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATH_HEADER, request.nextUrl.pathname);

  const nextWithHeaders = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  const config = getSupabaseConfig();
  let response = nextWithHeaders();

  if (!config) {
    captureReferral(request, response);
    return response;
  }

  // Without a Supabase auth cookie there is no session to refresh — skip the
  // network call to Supabase Auth for anonymous traffic.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"));

  if (!hasAuthCookie) {
    const protectedPath = ["/cabinet", "/admin", "/onboarding"].some(
      (prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`)
    );

    if (protectedPath) {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      login.search = "";
      login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(login);
    }

    captureReferral(request, response);
    return response;
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[],
        headers: Record<string, string>
      ) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = nextWithHeaders();
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      }
    }
  });

  // Refreshes the auth token when it is close to expiry so long-lived
  // sessions do not silently expire between server component renders.
  await supabase.auth.getUser();

  // Set last: the Supabase cookie handler above may have replaced the
  // response object, which would drop an earlier cookie write.
  captureReferral(request, response);

  return response;
}

export const config = {
  // Skip static assets (any path with a file extension) and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
