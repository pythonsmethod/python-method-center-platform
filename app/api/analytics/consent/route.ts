import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CONSENT_COOKIE, CONSENT_DENIED_COOKIE, CONSENT_VERSION, JOURNEY_COOKIE, JOURNEY_MAX_AGE } from "@/lib/product-analytics/contract";
import { analyticsEnabled, newJourney, readJourney } from "@/lib/product-analytics/session";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { allowAnalyticsRequest, smallAnalyticsBody } from "@/lib/product-analytics/request";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  if (!allowAnalyticsRequest(request)) return new NextResponse(null, { status: 429 });
  let body: unknown;
  try { body = await smallAnalyticsBody(request); } catch { return new NextResponse(null, { status: 400 }); }
  const granted = (body as { granted?: unknown })?.granted;
  if (typeof granted !== "boolean") return new NextResponse(null, { status: 400 });
  if (granted && !analyticsEnabled()) return new NextResponse(null, { status: 503 });
  const jar = await cookies();
  const old = readJourney(jar.get(JOURNEY_COOKIE)?.value);
  const response = NextResponse.json({ granted }, { headers: { "Cache-Control": "private, no-store" } });
  const options = { path: "/", secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, maxAge: JOURNEY_MAX_AGE };
  response.cookies.set(CONSENT_COOKIE, granted ? CONSENT_VERSION : "no", { ...options, httpOnly: true });
  response.cookies.set(CONSENT_DENIED_COOKIE, granted ? "" : "1", { ...options, httpOnly: false, maxAge: granted ? 0 : JOURNEY_MAX_AGE });
  response.cookies.set(JOURNEY_COOKIE, granted ? (old ? jar.get(JOURNEY_COOKIE)!.value : newJourney()!) : "", { ...options, httpOnly: true, maxAge: granted ? JOURNEY_MAX_AGE : 0 });
  // Withdrawal stops new events immediately and removes this browser's stored journey.
  if (!granted && old) {
    try {
      const db = createSupabaseServiceClient();
      if (db) await db.from("product_events").delete().eq("journey_id", old);
    } catch { /* Retention remains the fallback if storage is unavailable. */ }
  }
  return response;
}
