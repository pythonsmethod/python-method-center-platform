import { AppScreen } from "@/components/cabinet/AppScreen";
import { getLocale } from "@/lib/i18n/locale";
export default async function PreviewToday() { const locale = await getLocale(); return <AppScreen locale={locale} name={locale === "ru" ? "Анна" : "Anna"} screen="today" />; }
