import { NextResponse } from "next/server";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { getCaseMessages } from "@/lib/messages/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

export const runtime = "nodejs";

// Live-poll endpoint for the case thread. Staff may read any case;
// a client only their own.
export async function GET(request: Request) {
  const supabase = createSupabaseServiceClient();
  const authClient = await createSupabaseServerClient();

  if (!supabase || !authClient) {
    return NextResponse.json({ error: "Сервис недоступен." }, { status: 503 });
  }

  const url = new URL(request.url);
  const requestedCaseId = url.searchParams.get("caseId");

  let caseId: string | null = null;

  const staff = await getStaffUserState();

  if (staff.status === "authorized") {
    if (!requestedCaseId || !isUuid(requestedCaseId)) {
      return NextResponse.json({ error: "Некорректный кейс." }, { status: 400 });
    }

    caseId = requestedCaseId;
  } else {
    const {
      data: { user }
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Нет доступа." }, { status: 401 });
    }

    const { data: caseRow } = await supabase
      .from("client_cases")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!caseRow) {
      return NextResponse.json({ messages: [] });
    }

    caseId = caseRow.id;
  }

  if (!caseId) {
    return NextResponse.json({ error: "Некорректный кейс." }, { status: 400 });
  }

  const result = await getCaseMessages(caseId);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ messages: result.messages });
}
