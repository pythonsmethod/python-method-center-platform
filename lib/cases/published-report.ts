// Server service credentials are never used from a browser.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { renderPublishedReport, type PublishedReport } from "./report-pdf";
const bucket = "case-reports";
const digest = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
export async function ensurePublishedReport(approvalId: string, locale: "ru" | "en", caseId: string) {
  if (typeof window !== "undefined") throw new Error("SERVER_ONLY");
  const db = createSupabaseServiceClient(); if (!db) throw new Error("REPORT_STORAGE_UNAVAILABLE");
  const { data: publication, error: pe } = await db.from("case_messages").select("id,body").eq("approved_review_event_id", approvalId).eq("case_id",caseId).maybeSingle();
  const { data: approval, error: ae } = await db.from("case_review_learning_events").select("id,approved_text,approved_at,documents_fingerprint,report_snapshot,report_files").eq("id",approvalId).eq("case_id",caseId).maybeSingle();
  if (pe || ae || !publication || !approval || publication.body !== approval.approved_text || !approval.report_snapshot) throw new Error("NOT_PUBLISHED");
  const reportPath = `${approvalId}/${locale}-v1.pdf`;
  const existing = approval.report_files?.[locale];
  if (existing && (existing.version !== "1" || existing.path !== reportPath || !/^[a-f0-9]{64}$/.test(existing.sha256))) throw new Error("REPORT_MANIFEST_INVALID");
  if (existing) {
    const stored = await db.storage.from(bucket).download(reportPath);
    if (stored.error || !stored.data) throw new Error("REPORT_READBACK_FAILED");
    const bytes = new Uint8Array(await stored.data.arrayBuffer());
    if (digest(bytes) !== existing.sha256) throw new Error("REPORT_HASH_MISMATCH");
    return bytes;
  }
  const font = await readFile(path.join(process.cwd(), "public/fonts/Ubuntu-R.ttf"));
  const bytes = await renderPublishedReport(approval as PublishedReport, locale, font);
  const sha256 = digest(bytes), manifest = { version: "1", path: reportPath, sha256 };
  // Never overwrite. An unknown storage response is reconciled by exact byte hash before saving the pointer.
  await db.storage.from(bucket).upload(reportPath,bytes,{contentType:"application/pdf",upsert:false});
  const readback = await db.storage.from(bucket).download(reportPath);
  if (readback.error || !readback.data || digest(new Uint8Array(await readback.data.arrayBuffer())) !== sha256) throw new Error("REPORT_READBACK_FAILED");
  const saved = await db.rpc("save_pmc_report_file", {p_approval:approvalId,p_locale:locale,p_file:manifest});
  // Do not repeat an unknown write: re-read the immutable ledger entry.
  const verify = await db.from("case_review_learning_events").select("report_files").eq("id",approvalId).eq("case_id",caseId).maybeSingle();
  if (verify.error || JSON.stringify(verify.data?.report_files?.[locale]) === undefined || verify.data?.report_files?.[locale]?.sha256 !== sha256 || verify.data?.report_files?.[locale]?.path !== reportPath) throw new Error(saved.error ? "REPORT_SAVE_UNKNOWN" : "REPORT_READBACK_FAILED");
  return bytes;
}
