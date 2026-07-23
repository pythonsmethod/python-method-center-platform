import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const CASE_AUDIO_BUCKET = "case-audio";
const SIGNED_URL_TTL_SECONDS = 3600;

export type CaseMessage = {
  id: string;
  sender_role: string;
  body: string | null;
  audio_path: string | null;
  audio_duration_seconds: number | null;
  created_at: string;
  audioUrl: string | null;
};

export type CaseMessagesResult = {
  messages: CaseMessage[];
  error: string | null;
};

// Marks counterpart messages as read for the viewing side. Fire-and-forget:
// a failure here must never break rendering the thread.
export async function markThreadRead(
  caseId: string,
  viewer: "client" | "staff"
): Promise<void> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  const query = supabase
    .from("case_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("case_id", caseId)
    .is("read_at", null);

  if (viewer === "staff") {
    await query.eq("sender_role", "client");
  } else {
    await query.neq("sender_role", "client");
  }
}

// Unread client messages for staff: total and per case.
export async function getStaffUnreadCounts(): Promise<{
  total: number;
  byCase: Record<string, number>;
}> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { total: 0, byCase: {} };
  }

  const { data, error } = await supabase
    .from("case_messages")
    .select("case_id")
    .eq("sender_role", "client")
    .is("read_at", null)
    .limit(2000);

  if (error || !data) {
    return { total: 0, byCase: {} };
  }

  const byCase: Record<string, number> = {};

  for (const row of data) {
    byCase[row.case_id] = (byCase[row.case_id] ?? 0) + 1;
  }

  return { total: data.length, byCase };
}

// Loads a case thread and signs playback URLs for voice messages.
// Callers are responsible for authorization (client owns the case / staff).
export async function getCaseMessages(caseId: string): Promise<CaseMessagesResult> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { messages: [], error: "Supabase недоступен." };
  }

  const { data, error } = await supabase
    .from("case_messages")
    .select(
      "id, sender_role, body, audio_path, audio_duration_seconds, created_at"
    )
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    return { messages: [], error: error.message };
  }

  const messages: CaseMessage[] = [];

  for (const row of data ?? []) {
    let audioUrl: string | null = null;

    if (row.audio_path) {
      const { data: signed } = await supabase.storage
        .from(CASE_AUDIO_BUCKET)
        .createSignedUrl(row.audio_path, SIGNED_URL_TTL_SECONDS);

      audioUrl = signed?.signedUrl ?? null;
    }

    messages.push({ ...row, audioUrl } as CaseMessage);
  }

  return { messages, error: null };
}
