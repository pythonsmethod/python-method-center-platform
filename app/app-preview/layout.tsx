import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CabinetShell } from "@/components/cabinet/CabinetShell";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";

export default async function PreviewLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  const locale = await getLocale();
  return <CabinetShell email={locale === "ru" ? "Предпросмотр приложения" : "App preview"} greetingName={locale === "ru" ? "Анна" : "Anna"} labels={getDictionary(locale).cabinet} locale={locale} preview supplementsDue={1} tokens={0} unread={1}>{children}</CabinetShell>;
}
