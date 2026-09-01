import type {
  ClientSupportRequest,
  SupportRequestMessage
} from "@/lib/support/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SUPPORT_AUDIO_BUCKET = "support-audio";
const SIGNED_URL_TTL_SECONDS = 3600;

type SupportMessageRow = Omit<SupportRequestMessage, "audioUrl"> & {
  support_request_id: string;
};

async function signSupportMessages(
  supabase: SupabaseClient,
  rows: SupportMessageRow[]
): Promise<Array<SupportMessageRow & { audioUrl: string | null }>> {
  return Promise.all(rows.map(async (row) => {
    let audioUrl: string | null = null;
    if (row.audio_path) {
      const { data } = await supabase.storage
        .from(SUPPORT_AUDIO_BUCKET)
        .createSignedUrl(row.audio_path, SIGNED_URL_TTL_SECONDS);
      audioUrl = data?.signedUrl ?? null;
    }
    return { ...row, audioUrl };
  }));
}

export type ClientSupportRequestsResult =
  | {
      status: "ready";
      requests: ClientSupportRequest[];
    }
  | {
      status: "error";
      message: string;
    };

export async function getOwnSupportRequests(
  profileId: string
): Promise<ClientSupportRequestsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      status: "error",
      message: SERVICE_UNAVAILABLE_MESSAGE
    };
  }

  const { data, error } = await supabase
    .from("support_requests")
    .select("id, subject, body, status, created_at, updated_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { status: "error", message: error.message };
  }

  const requests = (data ?? []) as Omit<ClientSupportRequest, "messages">[];
  const requestIds = requests.map((request) => request.id);
  const { data: messageRows, error: messagesError } = requestIds.length
    ? await supabase
        .from("support_request_messages")
        .select("id, support_request_id, sender_role, body, audio_path, audio_duration_seconds, created_at")
        .in("support_request_id", requestIds)
        .order("created_at", { ascending: true })
        .limit(1000)
    : { data: [], error: null };

  if (messagesError) {
    return { status: "error", message: messagesError.message };
  }

  const signer = createSupabaseServiceClient() ?? supabase;
  const signedRows = await signSupportMessages(signer, (messageRows ?? []) as SupportMessageRow[]);
  const messagesByRequest = new Map<string, SupportRequestMessage[]>();
  for (const row of signedRows) {
    const list = messagesByRequest.get(row.support_request_id) ?? [];
    list.push(row as SupportRequestMessage & { support_request_id: string });
    messagesByRequest.set(row.support_request_id, list);
  }

  return {
    status: "ready",
    requests: requests.map((request) => ({
      ...request,
      messages: messagesByRequest.get(request.id) ?? []
    }))
  };
}

export type StaffSupportRequestItem = {
  id: string;
  profile_id: string | null;
  case_id: string | null;
  subject: string;
  body: string | null;
  status: string;
  created_at: string;
  contact_email: string | null;
  profiles: {
    email: string | null;
    full_name: string | null;
    phone: string | null;
  } | null;
  messages: SupportRequestMessage[];
};

export type StaffSupportRequestsResult =
  | {
      status: "ready";
      requests: StaffSupportRequestItem[];
    }
  | {
      status: "error";
      message: string;
    };

export async function getStaffSupportRequests(): Promise<StaffSupportRequestsResult> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      status: "error",
      message:
        "Server-only Supabase service role key is required for staff support requests."
    };
  }

  const { data, error } = await supabase
    .from("support_requests")
    .select(
      "id, profile_id, case_id, subject, body, status, created_at, contact_email, profiles(email, full_name, phone)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { status: "error", message: error.message };
  }

  const requests = (data ?? []) as unknown as Omit<
    StaffSupportRequestItem,
    "messages"
  >[];
  const requestIds = requests.map((request) => request.id);
  const { data: messageRows, error: messagesError } = requestIds.length
    ? await supabase
        .from("support_request_messages")
        .select("id, support_request_id, sender_role, body, audio_path, audio_duration_seconds, created_at")
        .in("support_request_id", requestIds)
        .order("created_at", { ascending: true })
        .limit(5000)
    : { data: [], error: null };

  if (messagesError) {
    return { status: "error", message: messagesError.message };
  }

  const signedRows = await signSupportMessages(supabase, (messageRows ?? []) as SupportMessageRow[]);
  const messagesByRequest = new Map<string, SupportRequestMessage[]>();
  for (const row of signedRows) {
    const list = messagesByRequest.get(row.support_request_id) ?? [];
    list.push(row as SupportRequestMessage & { support_request_id: string });
    messagesByRequest.set(row.support_request_id, list);
  }

  return {
    status: "ready",
    requests: requests.map((request) => ({
      ...request,
      messages: messagesByRequest.get(request.id) ?? []
    }))
  };
}
