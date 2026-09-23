import { NextResponse } from "next/server";
import { deliverAssistantOutreach, isAssistantOutreachEnabled } from "@/lib/assistant/outreach";
import { purgeExpiredProductEvents } from "@/lib/product-analytics/retention";
import { deliverBirthdayGreetings } from "@/lib/assistant/birthday-greetings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Reuse this existing daily authenticated job: the Vercel Hobby project
  // cannot add another schedule. Collection-disabled environments no-op.
  try {
    await purgeExpiredProductEvents();
    const birthdayGreetings = await deliverBirthdayGreetings();
    if (!isAssistantOutreachEnabled()) {
      return NextResponse.json({ enabled: false, sent: 0, birthdayGreetings });
    }
    const sent = await deliverAssistantOutreach();
    return NextResponse.json({ enabled: true, sent, birthdayGreetings, batchLimit: 100 });
  } catch {
    // Do not log profiles, message contents, or raw provider errors.
    console.error("assistant-outreach-cron-failed");
    return NextResponse.json({ error: "Assistant outreach failed" }, { status: 503 });
  }
}
