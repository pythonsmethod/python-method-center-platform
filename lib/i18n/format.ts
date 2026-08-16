import type { Locale } from "@/lib/i18n/locale";

export function formatDateTime(value: string, locale: Locale = "ru"): string {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    dateStyle: "medium", timeStyle: "short"
  }).format(new Date(value));
}
