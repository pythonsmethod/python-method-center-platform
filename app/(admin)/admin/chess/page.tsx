import { notFound } from "next/navigation";
import { AnhamChess } from "@/components/cabinet/AnhamChess";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { getLocale } from "@/lib/i18n/locale";

export default async function KarenChessPage() {
  const auth = await getRequiredStaffUser("/admin/chess");

  if (auth.status === "missing-env") {
    return <div className="page-shell"><AuthSetupNotice title="Supabase Auth" /></div>;
  }
  if (auth.status === "forbidden") notFound();
  if (auth.status === "error") {
    return <div className="page-shell"><p className="form-message form-message--error">{auth.message}</p></div>;
  }
  if (resolvePrivateAssistantRole(auth.email) !== "karen") notFound();

  return (
    <div className="page-shell page-shell--wide">
      <AnhamChess locale={await getLocale()} storageScope="karen" />
    </div>
  );
}
