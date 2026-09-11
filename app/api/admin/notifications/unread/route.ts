import { NextResponse } from "next/server";
import { getFounderState } from "@/lib/auth/require-founder";
import { getGapUnreadCount } from "@/lib/assistant/escalation-store";
import { apiError, apiErrorLocale } from "@/lib/i18n/api-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The unread counter, for the founder only.
//
// Anyone else — signed out, a client, a support account, even an admin who
// is not on the founder allowlist — gets the same 403 and no number. The
// count itself is per founder: it is derived from the caller's session, never
// from a query parameter, so it cannot be read on someone else's behalf.
export async function GET() {
  const locale = await apiErrorLocale();
  const auth = await getFounderState();

  if (auth.status !== "authorized") {
    return NextResponse.json(
      { error: apiError("accessDenied", locale) },
      { status: 403 }
    );
  }

  return NextResponse.json({ unread: await getGapUnreadCount(auth.userId) });
}
