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

// How long the run may keep claiming work, and how many documents it may
// take in one go. maxDuration is 300 seconds, so it stops well before the
// platform would cut it off mid-document and leave a job locked.
const BATCH_BUDGET_MS = 240_000;
const BATCH_MAX_DOCUMENTS = 60;

// The daily run drains the queue instead of taking one file off the top.
//
// It used to process exactly one document per invocation, and the schedule
// is once a day: a case with four uploads waiting on the queue needed four
// days, and a retry booked for "one minute from now" waited until tomorrow.
// The upload path in the cabinet still triggers its own run, so the happy
// case never depended on this; what did depend on it was everything that
// failed once and had to come back.
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const processed: Record<string, number> = {};
  let documents = 0;

  while (
    documents < BATCH_MAX_DOCUMENTS &&
    Date.now() - startedAt < BATCH_BUDGET_MS
  ) {
    const result = await processNextDocument();

    // Nothing left to claim, or nothing that can be claimed right now: a
    // job whose retry is still in the future is not idle work to spin on.
    if (result.status === "idle") {
      break;
    }

    processed[result.status] = (processed[result.status] ?? 0) + 1;
    documents += 1;
  }

  const expiredPeriods = await expireElapsedServicePeriods();

  return NextResponse.json({
    documents,
    processed,
    expiredPeriods,
    // True when the run hit its budget rather than emptying the queue, so
    // an operator reading the log can tell the difference.
    truncated: documents >= BATCH_MAX_DOCUMENTS
  });
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
