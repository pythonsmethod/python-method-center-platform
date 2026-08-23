import { AnhamChess } from "@/components/cabinet/AnhamChess";
import { getLocale } from "@/lib/i18n/locale";

export default async function PreviewChessPage() {
  return <AnhamChess locale={await getLocale()} preview />;
}
