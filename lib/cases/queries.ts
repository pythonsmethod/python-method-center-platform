import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ClientCaseShell = {
  id: string;
  case_number: string | null;
  status: string;
  urgency: string;
  direction: string;
  title: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientCaseShellResult =
  | {
      status: "ready";
      case: ClientCaseShell | null;
    }
  | {
      status: "error";
      message: string;
    };

export async function getClientCaseShell(
  profileId: string
): Promise<ClientCaseShellResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      status: "error",
      message: "Supabase is not configured."
    };
  }

  const { data, error } = await supabase
    .from("client_cases")
    .select(
      "id, case_number, status, urgency, direction, title, summary, created_at, updated_at"
    )
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    return {
      status: "error",
      message: error.message
    };
  }

  return {
    status: "ready",
    case: data as ClientCaseShell | null
  };
}
