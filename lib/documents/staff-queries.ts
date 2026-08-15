import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { DocumentIntakeStatus } from "@/lib/documents/types";

export type StaffDocumentIntakeItem = {
  id: string;
  profile_id: string;
  case_id: string;
  original_filename: string | null;
  document_status: DocumentIntakeStatus;
  created_at: string;
  profiles: {
    email: string | null;
    full_name: string | null;
  } | null;
  client_cases: {
    title: string | null;
  } | null;
};

export type StaffDocumentIntakeResult =
  | {
      status: "ready";
      documents: StaffDocumentIntakeItem[];
    }
  | {
      status: "missing-service-role";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

export async function getStaffDocumentIntakeItems(): Promise<StaffDocumentIntakeResult> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      status: "missing-service-role",
      message:
        "Server-only Supabase service role key is required for staff document intake."
    };
  }

  const { data, error } = await supabase
    .from("uploaded_documents")
    .select(
      "id, profile_id, case_id, original_filename, document_status, created_at, profiles(email, full_name), client_cases(title)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return {
      status: "error",
      message: error.message
    };
  }

  return {
    status: "ready",
    documents: (data ?? []) as unknown as StaffDocumentIntakeItem[]
  };
}
