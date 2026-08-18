import { NextRequest, NextResponse } from "next/server";
import { processNextDocument } from "@/lib/documents/processing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const schedulerKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const authorization = request.headers.get("authorization");
  return Boolean(
    (secret && authorization === `Bearer ${secret}`) ||
    (schedulerKey && authorization === `Bearer ${schedulerKey}`)
  );
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await processNextDocument();
  return NextResponse.json({ status: result.status });
}

export async function POST() {
  const authClient = await createSupabaseServerClient();
  if (!authClient) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await processNextDocument();
  return NextResponse.json({ status: result.status });
}
