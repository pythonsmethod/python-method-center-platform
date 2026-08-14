import { AppScreen } from "@/components/cabinet/AppScreen";
import { getLocale } from "@/lib/i18n/locale";

export default async function AnhamPage() {
  return <AppScreen locale={await getLocale()} screen="anham" />;
}
