import { NextResponse } from "next/server";
import { DOCUMENT_STORAGE_BUCKET } from "@/lib/documents/config";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type DocumentViewRouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: DocumentViewRouteContext
) {
  const { documentId } = await params;
  const auth = await getStaffUserState();

  if (auth.status === "missing-env") {
    return NextResponse.json(
      { error: "Supabase Auth is not configured." },
      { status: 503 }
    );
  }

  if (auth.status === "unauthenticated") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `/admin/documents/${documentId}/view`);
    return NextResponse.redirect(loginUrl);
  }

  if (auth.status === "forbidden") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (auth.status === "error") {
    return NextResponse.json({ error: auth.message }, { status: 500 });
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server document access is not configured." },
      { status: 503 }
    );
  }

  const { data: document, error: documentError } = await supabase
    .from("uploaded_documents")
    .select("id, storage_path, metadata")
    .eq("id", documentId)
    .maybeSingle();

  if (documentError) {
    return NextResponse.json({ error: documentError.message }, { status: 500 });
  }

  if (!document) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const metadata = document.metadata as { storage_bucket?: unknown } | null;
  const bucket =
    typeof metadata?.storage_bucket === "string"
      ? metadata.storage_bucket
      : DOCUMENT_STORAGE_BUCKET;
  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(document.storage_path, 60);

  if (signedUrlError) {
    return NextResponse.json({ error: signedUrlError.message }, { status: 500 });
  }

  return NextResponse.redirect(signedUrl.signedUrl);
}
