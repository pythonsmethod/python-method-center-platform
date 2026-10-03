import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { canAccessProfessorMessages } from "@/lib/auth/require-karen";
import { ensurePublishedReport } from "@/lib/cases/published-report";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function GET(request: Request) {
  const url = new URL(request.url), locale = url.searchParams.get("locale") === "en" ? "en" : "ru";
  const fail = (status: number) => Response.json({error: locale === "en" ? "The published report is unavailable." : "Опубликованный файл недоступен."},{status,headers:{"Cache-Control":"no-store"}});
  if (Array.from(url.searchParams.keys()).some(k => !["approval","case","locale"].includes(k)) || (request.headers.get("content-length") ?? "0") !== "0") return fail(400);
  const approval = url.searchParams.get("approval") ?? "", caseId = url.searchParams.get("case") ?? "";
  if (!uuid.test(approval) || !uuid.test(caseId)) return fail(400);
  const session = await createSupabaseServerClient(); const user = session ? await session.auth.getUser() : null;
  if (!user?.data.user || user.error) return fail(401);
  const db = createSupabaseServiceClient(); if (!db) return fail(503);
  const profile = await db.from("profiles").select("role,status").eq("id",user.data.user.id).maybeSingle();
  if (profile.error || !profile.data || profile.data.status !== "active") return fail(403);
  const own = await db.from("client_cases").select("profile_id").eq("id",caseId).maybeSingle();
  if (own.error || !own.data || !(profile.data.role === "client" && own.data.profile_id === user.data.user.id || ["admin","support"].includes(profile.data.role) && canAccessProfessorMessages(user.data.user.email))) return fail(403);
  try {
    const bytes = await ensurePublishedReport(approval,locale,caseId);
    return new Response(bytes as BodyInit,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="pmc-report-${approval}-${locale}.pdf"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  } catch { return fail(409); }
}
