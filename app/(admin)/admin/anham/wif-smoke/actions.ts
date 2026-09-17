"use server";

import { headers } from "next/headers";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { createGoogleWorkloadIdentityAccessToken } from "@/lib/document-extraction/google-workload-identity";
import { runSyntheticGoogleSmoke } from "@/lib/document-extraction/synthetic-google-smoke";

export async function runOcrSmoke(): Promise<string> {
  const auth = await getStaffUserState();
  if (auth.status !== "authorized" || auth.role !== "admin" ||
      process.env.VERCEL_ENV !== "preview" ||
      !/^anham-clinical-staging-[a-z0-9]+-pythonsmethods-projects\.vercel\.app$/.test(process.env.VERCEL_URL ?? "") ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://thylrayzjczsxlyqhtfc.supabase.co" ||
      process.env.ANHAM_PHI_PROCESSING_AUTHORIZED !== "false") return "denied";
  const h = await headers();
  const origin = h.get("origin");
  if (!origin || origin !== `https://${process.env.VERCEL_URL}`) return "denied";
  try {
    const receipt = await runSyntheticGoogleSmoke(createGoogleWorkloadIdentityAccessToken({
      ...process.env, VERCEL_OIDC_TOKEN: h.get("x-vercel-oidc-token") ?? undefined,
    }));
    return JSON.stringify(receipt, null, 2);
  } catch (error) {
    // Never expose provider payloads or credentials.
    const message = error instanceof Error ? error.message : "";
    const status = /^Google Document AI request failed \((\d{3})\)$/.exec(message)?.[1];
    return status ? `document_ai_http_${status}` : "synthetic_test_failed";
  }
}
