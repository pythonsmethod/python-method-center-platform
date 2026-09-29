import type { CaseLifecycleEvent } from "@/lib/cases/lifecycle";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type StaffCaseListItem = {
  id: string;
  case_number: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    email: string | null;
    full_name: string | null;
    phone: string | null;
    avatar_path?: string | null;
    delivery_first_name?: string | null;
    delivery_last_name?: string | null;
    delivery_email?: string | null;
    delivery_phone?: string | null;
    delivery_country_code?: string | null;
    delivery_region?: string | null;
    delivery_city?: string | null;
    delivery_street?: string | null;
    delivery_building?: string | null;
    delivery_unit?: string | null;
    delivery_postal_code?: string | null;
    delivery_instructions?: string | null;
    country_code?: string | null;
  } | null;
  care_recipients: Array<{
    id: string;
    recipient_type: "adult" | "minor";
    full_name: string;
    birth_date: string | null;
    relationship_to_client: string;
    client_role_for_recipient: string;
    reason_for_representation: string;
    representative_confirmed: boolean;
    data_processing_consent: boolean;
    responsibility_acknowledged: boolean;
    is_current: boolean;
  }>;
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

export type KarenTodayActivity = {
  caseIds: string[];
  latestAtByCase: Record<string, string>;
};

type TodayActivityRow = {
  case_id?: string | null;
  id?: string | null;
  created_at: string;
};

export async function getKarenTodayActivity(
  dayStart: string,
  dayEnd: string
): Promise<KarenTodayActivity> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { caseIds: [], latestAtByCase: {} };

  const query = (table: string, columns: string) =>
    supabase
      .from(table)
      .select(columns)
      .gte("created_at", dayStart)
      .lt("created_at", dayEnd)
      .limit(2000);
  const results = await Promise.all([
    query("client_cases", "id, created_at"),
    query("case_messages", "case_id, created_at"),
    query("uploaded_documents", "case_id, created_at"),
    query("onboarding_submissions", "case_id, created_at"),
    query("payments", "case_id, created_at"),
    query("case_lifecycle_events", "case_id, created_at")
  ]);
  const latestAtByCase: Record<string, string> = {};

  for (const result of results) {
    if (result.error) continue;
    for (const row of (result.data ?? []) as unknown as TodayActivityRow[]) {
      const caseId = row.case_id ?? row.id;
      if (!caseId) continue;
      if (!latestAtByCase[caseId] || row.created_at > latestAtByCase[caseId]) {
        latestAtByCase[caseId] = row.created_at;
      }
    }
  }

  return { caseIds: Object.keys(latestAtByCase), latestAtByCase };
}

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
      "id, case_number, title, created_at, updated_at, profiles(email, full_name, phone, avatar_path, country_code)"
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
  identity_review_status: string | null;
  created_at: string;
};

export type StaffCasePayment = {
  id: string;
  product: string;
  status: string;
  amount_cents: number;
  currency: string;
  processor_reference: string | null;
  paid_at: string | null;
  created_at: string;
};

export type StaffCaseLifecycleEvent = CaseLifecycleEvent;

export type StaffCaseDetail = {
  id: string;
  profile_id: string;
  title: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    email: string | null;
    full_name: string | null;
    phone: string | null;
    avatar_path?: string | null;
    delivery_first_name?: string | null;
    delivery_last_name?: string | null;
    delivery_email?: string | null;
    delivery_phone?: string | null;
    delivery_country_code?: string | null;
    delivery_region?: string | null;
    delivery_city?: string | null;
    delivery_street?: string | null;
    delivery_building?: string | null;
    delivery_unit?: string | null;
    delivery_postal_code?: string | null;
    delivery_instructions?: string | null;
  } | null;
  onboarding_submissions: StaffOnboardingSubmission[];
  uploaded_documents: StaffCaseDocument[];
  payments: StaffCasePayment[];
  case_lifecycle_events: StaffCaseLifecycleEvent[];
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
      `id, profile_id, title, summary, created_at, updated_at,
       profiles(email, full_name, phone, avatar_path, delivery_first_name, delivery_last_name, delivery_email, delivery_phone, delivery_country_code, delivery_region, delivery_city, delivery_street, delivery_building, delivery_unit, delivery_postal_code, delivery_instructions),
       care_recipients(id, recipient_type, full_name, birth_date, relationship_to_client, client_role_for_recipient, reason_for_representation, representative_confirmed, data_processing_consent, responsibility_acknowledged, is_current),
       onboarding_submissions(id, status, submitted_at, payload),
       uploaded_documents(id, original_filename, document_status, identity_review_status, created_at),
       payments(id, product, status, amount_cents, currency, processor_reference, paid_at, created_at),
       case_lifecycle_events(id, event_type, actor_role, notes, created_at)`
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
