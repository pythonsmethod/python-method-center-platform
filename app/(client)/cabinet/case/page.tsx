import { AppScreen } from "@/components/cabinet/AppScreen";
import { getLocale } from "@/lib/i18n/locale";

export default async function CasePage() {
  return <AppScreen locale={await getLocale()} screen="case" />;
}
