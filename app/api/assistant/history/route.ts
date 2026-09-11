import { NextResponse } from "next/server";
import { getOwnAssistantHistory, HISTORY_PAGE_SIZE } from "@/lib/assistant/history";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { getPrivateAssistantUserState } from "@/lib/auth/require-private-assistant";
import { isUuid } from "@/lib/utils/uuid";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const locale = await getLocale();
  const respond = (body: unknown, status = 200) => NextResponse.json(body, {
    status, headers: { "Cache-Control": "private, no-store" }
  });
  const params = new URL(request.url).searchParams;
  const privateHistory = params.get("scope") === "private";
  const caseId = params.get("caseId");
  const before = params.has("before") ? Number(params.get("before")) : undefined;
  if ((caseId && !isUuid(caseId)) || (before !== undefined && (!Number.isSafeInteger(before) || before <= 0))) {
    return respond({ error: locale === "ru" ? "Некорректный запрос истории." : "Invalid history request." }, 400);
  }
  let profileId: string;
  if (privateHistory) {
    const auth = await getPrivateAssistantUserState();
    if (auth.status !== "authorized" || !resolvePrivateAssistantRole(auth.email)) return respond({ error: locale === "ru" ? "Нет доступа." : "Access denied." }, 403);
    profileId = auth.userId;
  } else {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
    const auth = await createSupabaseServerClient(token);
    if (!auth) return respond({ error: locale === "ru" ? "История временно недоступна." : "History is temporarily unavailable." }, 503);
    const { data: { user } } = await auth.auth.getUser(token || undefined);
    if (!user) return respond({ error: locale === "ru" ? "Войдите, чтобы загрузить историю." : "Sign in to load history." }, 401);
    profileId = user.id;
  }
  try {
    const result = await getOwnAssistantHistory(profileId, locale, HISTORY_PAGE_SIZE, { private: privateHistory, caseId, before });
    if (result.status === "error") return respond({ error: result.message }, 503);
    return respond({ messages: result.messages, hasMore: result.hasMore ?? result.messages.length === HISTORY_PAGE_SIZE });
  } catch {
    return respond({ error: locale === "ru" ? "Не удалось загрузить историю." : "Could not load history." }, 503);
  }
}
