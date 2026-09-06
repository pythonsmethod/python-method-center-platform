import { NextResponse } from "next/server";
import { saveAssistantExchange } from "@/lib/assistant/history";
import { resolveAssistantAudience } from "@/lib/assistant/tiers";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
  const audience = await resolveAssistantAudience(accessToken);
  if (!audience.profileId || audience.tier === "guest") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { user?: unknown; assistant?: unknown; locale?: unknown } | null;
  const question = typeof body?.user === "string" ? body.user.trim() : "";
  const answer = typeof body?.assistant === "string" ? body.assistant.trim() : "";
  if (!question || !answer) return NextResponse.json({ error: "Invalid transcript" }, { status: 400 });
  await saveAssistantExchange({ profileId: audience.profileId, caseId: audience.caseId, tier: audience.tier, question, answer, locale: body?.locale === "en" ? "en" : "ru" });
  return NextResponse.json({ saved: true });
}
