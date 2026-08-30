import { AnhamChess } from "@/components/cabinet/AnhamChess";
import { OnlineChessWithKaren } from "@/components/cabinet/OnlineChessWithKaren";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getLocale } from "@/lib/i18n/locale";

export default async function ChessPage() {
  const auth = await getRequiredUser("/cabinet/chess");
  const storageScope = auth.status === "authenticated"
    ? `client-${auth.userId}`
    : "client-setup";

  const locale = await getLocale();
  return <>
    <AnhamChess locale={locale} storageScope={storageScope} />
    <OnlineChessWithKaren locale={locale} viewer="client" />
  </>;
}
