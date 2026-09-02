import type { ReactNode } from "react";
import { CabinetShell } from "@/components/cabinet/CabinetShell";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientCaseShell } from "@/lib/cases/queries";
import { hasQuestionnaire } from "@/lib/health/queries";
import { getUnreadForClient } from "@/lib/messages/queries";
import { getSupplementsDueCount } from "@/lib/supplements/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getTokenLedger } from "@/lib/tokens/queries";
import { redirect } from "next/navigation";
import { getClientDeliveryUnreadCount } from "@/lib/delivery/queries";
import { getClientSupportUnreadCount } from "@/lib/support/queries";

// The name a person gave us, not the front half of their email address.
// Falls back quietly: a greeting is never worth an error page.
async function greetingFor(userId: string, email: string | null,
  fallback: string
): Promise<string> {
  try {
    const supabase = createSupabaseServiceClient();

    if (supabase) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();

      const full = (data?.full_name ?? "").trim();

      if (full) {
        // As the person wrote it. Guessing which half is the first name is
        // a guess we would get wrong for half our clients.
        return full;
      }
    }
  } catch {
    // Fall through to the email.
  }

  return email ? email.split("@")[0] : fallback;
}

// The shell is shared by every cabinet page, so the person keeps the same
// sidebar and the same header wherever they go inside.
export default async function CabinetLayout({
  children
}: {
  children: ReactNode;
}) {
  const auth = await getRequiredUser("/cabinet");
  const locale = await getLocale();
  const dict = getDictionary(locale).cabinet;

  if (auth.status === "missing-env") {
    return (
      <CabinetShell
        email={null}
        greetingName={dict.friend}
        labels={dict}
        locale={locale}
        supplementsDue={0}
        tokens={0}
        unread={0}
      >
        {children}
      </CabinetShell>
    );
  }

  const roleClient = createSupabaseServiceClient();
  const { data: roleProfile } = roleClient
    ? await roleClient.from("profiles").select("role").eq("id", auth.userId).maybeSingle()
    : { data: null };
  if (roleProfile?.role === "volunteer") redirect("/volunteer");

  const caseResult = await getClientCaseShell(auth.userId);
  const caseId =
    caseResult.status === "ready" && caseResult.case ? caseResult.case.id : null;

  const [unread, supportUnread, tokens, greetingName, supplementsDue, deliveryUnread, documentsAttentionResult, questionnaireFilled] = await Promise.all([
    caseId ? getUnreadForClient(caseId) : Promise.resolve(0),
    getClientSupportUnreadCount(auth.userId),
    getTokenLedger(auth.userId),
    greetingFor(auth.userId, auth.email, dict.friend),
    getSupplementsDueCount(),
    getClientDeliveryUnreadCount(auth.userId),
    roleClient?.from("uploaded_documents").select("id", { count: "exact", head: true })
      .eq("profile_id", auth.userId).in("document_status", ["needs_reupload", "failed", "identity_mismatch"]),
    hasQuestionnaire()
  ]);

  return (
    <CabinetShell
      email={auth.email}
      labels={dict}
      locale={locale}
      greetingName={greetingName}
      supplementsDue={supplementsDue}
      tokens={tokens.balance}
      unread={unread}
      supportUnread={supportUnread}
      deliveryUnread={deliveryUnread}
      documentsAttention={documentsAttentionResult?.count ?? 0}
      questionnaireDue={questionnaireFilled ? 0 : 1}
    >
      {children}
    </CabinetShell>
  );
}
