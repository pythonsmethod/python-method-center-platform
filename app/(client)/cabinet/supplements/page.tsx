import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { SupplementsPanel } from "@/components/cabinet/SupplementsPanel";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getSupplementsWithToday } from "@/lib/supplements/queries";

export const dynamic = "force-dynamic";

// The supplement tracker: the person lists what THEY decided to take and
// when; the cabinet turns it into a daily checklist with a gentle nudge.
// The AI comments only on timing — never on what or how much.
export default async function CabinetSupplementsPage() {
  const auth = await getRequiredUser("/cabinet/supplements");

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="Добавки" title="Мои добавки" />
        <AuthSetupNotice title="Раздел требует настройки Supabase Auth" />
      </div>
    );
  }

  const now = new Date();
  const serverToday = now.toISOString().slice(0, 10);
  const serverNow = now.toISOString().slice(11, 16);
  const result = await getSupplementsWithToday(serverToday);

  return (
    <>
      <PageHeader
        eyebrow="Добавки"
        title="Мои добавки"
        description="Ежедневный чек-лист приёма: вы решаете, что и когда пить, кабинет напоминает и хранит отметки. Бесплатно для всех, у кого есть аккаунт."
      />

      {result.status === "ready" ? (
        <SupplementsPanel
          intakes={result.intakes}
          serverNow={serverNow}
          serverToday={serverToday}
          supplements={result.supplements}
        />
      ) : (
        <div className="cab-note">
          <strong>Раздел временно недоступен</strong>
          <span>Попробуйте обновить страницу чуть позже.</span>
        </div>
      )}
    </>
  );
}
