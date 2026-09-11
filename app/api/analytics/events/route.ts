import { NextResponse } from "next/server";
import { isBrowserEvent } from "@/lib/product-analytics/contract";
import { recordProductEvent } from "@/lib/product-analytics/record";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { allowAnalyticsRequest, smallAnalyticsBody } from "@/lib/product-analytics/request";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  if (!allowAnalyticsRequest(request)) return new NextResponse(null, { status: 429 });
  let body: { event?: unknown; locale?: unknown };
  try { body = await smallAnalyticsBody(request) as typeof body; } catch { return new NextResponse(null, { status: 400 }); }
  if (!body || !isBrowserEvent(body.event) || !["ru", "en"].includes(body.locale as string) || Object.keys(body).some(k => !["event", "locale"].includes(k))) return new NextResponse(null, { status: 400 });
  if (body.event === "cabinet_view" || body.event === "onboarding_view") {
    const db = await createSupabaseServerClient();
    const user = db ? (await db.auth.getUser()).data.user : null;
    if (!user) return new NextResponse(null, { status: 403 });
    const profile = await db!.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
    if (profile.error || profile.data?.role !== "client" || ["suspended", "closed"].includes(profile.data.status)) return new NextResponse(null, { status: 403 });
  }
  const recorded = await recordProductEvent(body.event, body.locale as "ru" | "en");
  return new NextResponse(null, { status: recorded ? 204 : 202, headers: { "Cache-Control": "no-store" } });
}
