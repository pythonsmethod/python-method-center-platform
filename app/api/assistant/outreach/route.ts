import { NextResponse } from "next/server";
import { stopAssistantOutreach } from "@/lib/assistant/outreach";
import { getLocale } from "@/lib/i18n/locale";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

async function handle(request?: Request) {
  const locale = await getLocale();
  const unavailable = locale === "ru" ? "Не удалось загрузить или сохранить настройку сообщений." : "Could not load or save your message preference.";
  try {
    const auth = await createSupabaseServerClient();
    if (!auth) return NextResponse.json({ error: unavailable }, { status: 503 });
    const { data: { user }, error } = await auth.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: locale === "ru" ? "Войдите в аккаунт." : "Please sign in." }, { status: 401 });
    }
    if (request) {
      const body = await request.json().catch(() => null);
      if (body?.optedOut !== true) {
        return NextResponse.json({ error: locale === "ru" ? "Некорректная настройка." : "Invalid preference." }, { status: 400 });
      }
      // Identity comes exclusively from the verified session, never the payload.
      await stopAssistantOutreach(user.id);
      return NextResponse.json({ optedOut: true });
    }
    const service = createSupabaseServiceClient();
    if (!service) throw new Error("Unavailable");
    const { data, error: queryError } = await service.from("assistant_outreach_state")
      .select("opted_out").eq("profile_id", user.id).maybeSingle();
    if (queryError) throw new Error("Unavailable");
    return NextResponse.json({ optedOut: data?.opted_out ?? false }, {
      headers: { "Cache-Control": "private, no-store" }
    });
  } catch {
    return NextResponse.json({ error: unavailable }, { status: 503 });
  }
}

export async function GET() { return handle(); }
export async function PATCH(request: Request) { return handle(request); }
