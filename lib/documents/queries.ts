import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UploadedDocument } from "@/lib/documents/types";

export type UploadedDocumentsResult =
  | {
      status: "ready";
      documents: UploadedDocument[];
    }
  | {
      status: "error";
      message: string;
    };

export async function getUploadedDocumentsForCase(
  profileId: string,
  caseId: string
): Promise<UploadedDocumentsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      status: "error",
      message: "Supabase is not configured."
    };
  }

  const { data, error } = await supabase
    .from("uploaded_documents")
    .select(
      "id, profile_id, case_id, document_type, status, storage_path, original_filename, metadata, created_at"
    )
    .eq("profile_id", profileId)
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      status: "error",
      message: error.message
    };
  }

  return {
    status: "ready",
    documents: (data ?? []) as UploadedDocument[]
  };
}
