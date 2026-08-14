import { AppScreen } from "@/components/cabinet/AppScreen";
import { getLocale } from "@/lib/i18n/locale";
export default async function PreviewDialog() { return <AppScreen locale={await getLocale()} screen="dialog" />; }
