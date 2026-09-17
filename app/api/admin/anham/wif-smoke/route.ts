import { NextResponse } from "next/server";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { createGoogleWorkloadIdentityAccessToken } from "@/lib/document-extraction/google-workload-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request?: Request) {
  const auth = await getStaffUserState();
  if (auth.status === "unauthenticated") return NextResponse.json({ ok: false }, { status: 401 });
  if (auth.status !== "authorized" || auth.role !== "admin") return NextResponse.json({ ok: false }, { status: 403 });
  if (process.env.VERCEL_ENV !== "preview" || process.env.ANHAM_PHI_PROCESSING_AUTHORIZED !== "false") {
    return NextResponse.json({ ok: false, code: "preview_only" }, { status: 404 });
  }
  try {
    const token = await createGoogleWorkloadIdentityAccessToken({
      ...process.env,
      VERCEL_OIDC_TOKEN: request?.headers.get("x-vercel-oidc-token") ?? process.env.VERCEL_OIDC_TOKEN,
    })();
    return NextResponse.json({ ok: token.length > 0, credential: "short_lived", documentSent: false, phiSent: false }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, code: "identity_exchange_failed" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
