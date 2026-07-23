import type { ClientSupportRequest } from "@/lib/support/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";

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

  return {
    status: "ready",
    requests: (data ?? []) as ClientSupportRequest[]
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

  return {
    status: "ready",
    requests: (data ?? []) as unknown as StaffSupportRequestItem[]
  };
}
