import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type StaffCaseListItem = {
  id: string;
  status: string;
  urgency: string;
  direction: string;
  title: string | null;
  created_at: string;
  profiles: {
    email: string | null;
    full_name: string | null;
    phone: string | null;
  } | null;
};

export type StaffCasesResult =
  | {
      status: "ready";
      cases: StaffCaseListItem[];
    }
  | {
      status: "error";
      message: string;
    };

export async function getStaffCases(): Promise<StaffCasesResult> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      status: "error",
      message:
        "Server-only Supabase service role key is required for staff case access."
    };
  }

  const { data, error } = await supabase
    .from("client_cases")
    .select(
      "id, status, urgency, direction, title, created_at, profiles(email, full_name, phone)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "ready",
    cases: (data ?? []) as unknown as StaffCaseListItem[]
  };
}

export type StaffOnboardingSubmission = {
  id: string;
  status: string;
  submitted_at: string | null;
  payload: Record<string, unknown>;
};

export type StaffCaseDocument = {
  id: string;
  original_filename: string | null;
  document_status: string;
  created_at: string;
};

export type StaffCaseDetail = {
  id: string;
  status: string;
  urgency: string;
  direction: string;
  title: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    email: string | null;
    full_name: string | null;
    phone: string | null;
  } | null;
  onboarding_submissions: StaffOnboardingSubmission[];
  uploaded_documents: StaffCaseDocument[];
};

export type StaffCaseDetailResult =
  | {
      status: "ready";
      case: StaffCaseDetail | null;
    }
  | {
      status: "error";
      message: string;
    };

export async function getStaffCaseDetail(
  caseId: string
): Promise<StaffCaseDetailResult> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      status: "error",
      message:
        "Server-only Supabase service role key is required for staff case access."
    };
  }

  const { data, error } = await supabase
    .from("client_cases")
    .select(
      `id, status, urgency, direction, title, summary, created_at, updated_at,
       profiles(email, full_name, phone),
       onboarding_submissions(id, status, submitted_at, payload),
       uploaded_documents(id, original_filename, document_status, created_at)`
    )
    .eq("id", caseId)
    .maybeSingle();

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "ready",
    case: (data as unknown as StaffCaseDetail) ?? null
  };
}
