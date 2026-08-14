import { AppScreen } from "@/components/cabinet/AppScreen";
import { getLocale } from "@/lib/i18n/locale";

export default async function CabinetPage() {
  return <AppScreen locale={await getLocale()} screen="today" />;
}
