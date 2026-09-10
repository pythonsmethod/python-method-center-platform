import { NextResponse } from "next/server";
import { deliverAssistantOutreach, isAssistantOutreachEnabled } from "@/lib/assistant/outreach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAssistantOutreachEnabled()) {
    return NextResponse.json({ enabled: false, sent: 0 });
  }
  try {
    const sent = await deliverAssistantOutreach();
    return NextResponse.json({ enabled: true, sent, batchLimit: 100 });
  } catch {
    // Do not log profiles, message contents, or raw provider errors.
    console.error("assistant-outreach-cron-failed");
    return NextResponse.json({ error: "Assistant outreach failed" }, { status: 503 });
  }
}
