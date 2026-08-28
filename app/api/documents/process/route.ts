import { NextRequest, NextResponse } from "next/server";
import { processNextDocument } from "@/lib/documents/processing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { expireElapsedServicePeriods } from "@/lib/payments/expire-periods";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [result, expiredPeriods] = await Promise.all([
    processNextDocument(),
    expireElapsedServicePeriods()
  ]);
  return NextResponse.json({ status: result.status, expiredPeriods });
}

// Called by the cabinet right after an upload, so the person who just sent a
// file does not wait for the daily cron. Being signed in used to be the only
// condition, which let any account spend the AI budget on other people's
// documents in a loop; now the caller has to have something of their own in
// the queue.
export async function POST() {
  const authClient = await createSupabaseServerClient();
  if (!authClient) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createSupabaseServiceClient();
  if (!service) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { data: own } = await service
    .from("document_processing_jobs")
    .select("id")
    .eq("profile_id", user.id)
    .in("status", ["queued", "processing"])
    .limit(1);

  // Nothing of theirs is waiting: nothing to do, and no reason to let the
  // request reach the queue at all.
  if (!own || own.length === 0) {
    return NextResponse.json({ status: "idle" });
  }

  const result = await processNextDocument();
  return NextResponse.json({ status: result.status });
}
