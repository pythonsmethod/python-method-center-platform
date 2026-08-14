import { AppScreen } from "@/components/cabinet/AppScreen";
import { getLocale } from "@/lib/i18n/locale";
export default async function PreviewCase() { return <AppScreen locale={await getLocale()} screen="case" />; }
