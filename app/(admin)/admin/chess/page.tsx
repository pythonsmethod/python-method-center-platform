import { notFound } from "next/navigation";
import { AnhamChess } from "@/components/cabinet/AnhamChess";
import { OnlineChessWithKaren } from "@/components/cabinet/OnlineChessWithKaren";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { isKarenAssistantEmail } from "@/lib/auth/require-karen";
import { getLocale } from "@/lib/i18n/locale";

export default async function StaffChessPage() {
  const auth = await getRequiredStaffUser("/admin/chess");

  if (auth.status === "missing-env") {
    return <div className="page-shell"><AuthSetupNotice title="Supabase Auth" /></div>;
  }
  if (auth.status === "forbidden") notFound();
  if (auth.status === "error") {
    return <div className="page-shell"><p className="form-message form-message--error">{auth.message}</p></div>;
  }
  const locale = await getLocale();
  return (
    <div className="page-shell page-shell--wide">
      <AnhamChess locale={locale} storageScope={`staff-${auth.userId}`} />
      {isKarenAssistantEmail(auth.email) ? <OnlineChessWithKaren locale={locale} viewer="karen" /> : null}
    </div>
  );
}
