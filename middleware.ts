import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { SITE_URL } from "@/lib/config/site";

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

  const config = getSupabaseConfig();
  let response = NextResponse.next({ request });

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
        response = NextResponse.next({ request });
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
