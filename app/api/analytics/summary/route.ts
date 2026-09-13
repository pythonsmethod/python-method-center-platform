import { NextResponse } from "next/server";
import { analyticsPeriod } from "@/lib/product-analytics/contract";
import { getProductAnalytics } from "@/lib/product-analytics/summary";
import { apiError, apiErrorLocale } from "@/lib/i18n/api-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const locale = await apiErrorLocale();
  const params = new URL(request.url).searchParams;
  const period = analyticsPeriod(params.get("start"), params.get("end"));
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!period) return NextResponse.json({ error: apiError("badRequest", locale) }, { status: 400, headers });
  const result = await getProductAnalytics(period);
  if (result.status === "forbidden") return NextResponse.json({ error: apiError("accessDenied", locale) }, { status: 403, headers });
  return NextResponse.json(result, { headers });
}
