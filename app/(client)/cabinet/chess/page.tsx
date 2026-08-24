import { AnhamChess } from "@/components/cabinet/AnhamChess";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getLocale } from "@/lib/i18n/locale";

export default async function ChessPage() {
  const auth = await getRequiredUser("/cabinet/chess");
  const storageScope = auth.status === "authenticated"
    ? `client-${auth.userId}`
    : "client-setup";

  return <AnhamChess locale={await getLocale()} storageScope={storageScope} />;
}
