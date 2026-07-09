import type { CaseLifecycleEvent } from "@/lib/cases/lifecycle";
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
      message: "Сервис временно недоступен: не настроено подключение к базе данных."
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

export type CaseLifecycleEventsResult =
  | {
      status: "ready";
      events: CaseLifecycleEvent[];
    }
  | {
      status: "error";
      message: string;
    };

export async function getOwnCaseLifecycleEvents(
  profileId: string,
  caseId: string
): Promise<CaseLifecycleEventsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      status: "error",
      message: "Сервис временно недоступен: не настроено подключение к базе данных."
    };
  }

  const { data, error } = await supabase
    .from("case_lifecycle_events")
    .select("id, event_type, from_status, to_status, actor_role, notes, created_at")
    .eq("profile_id", profileId)
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "ready",
    events: (data ?? []) as CaseLifecycleEvent[]
  };
}
