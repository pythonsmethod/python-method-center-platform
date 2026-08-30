import { NextRequest, NextResponse } from "next/server";
import { generateMedicalDigest } from "@/lib/medical-digest/digest";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const issue = await generateMedicalDigest();
    return NextResponse.json({
      ok: true,
      issueDate: issue.issueDate,
      sourceCount: issue.sourceCount
    });
  } catch (error) {
    console.error("medical-digest-cron-failed", error);
    return NextResponse.json({ error: "Digest generation failed" }, { status: 503 });
  }
}


