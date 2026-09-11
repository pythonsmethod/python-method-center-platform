import type { Locale } from "@/lib/i18n/locale";

export function LiveUsage({ locale, showCosts, seconds, usd, finalized }: { locale: Locale; showCosts: boolean; seconds: number; usd: number; finalized: boolean }) {
  return <p>{showCosts ? (locale === "ru" ? "Голосовой пилот" : "Voice pilot") : (locale === "ru" ? "Длительность разговора" : "Conversation duration")}: {Math.floor(seconds / 60)}:{String(Math.floor(seconds % 60)).padStart(2, "0")}{showCosts ? <> · ${usd.toFixed(3)} {locale === "ru" ? "за голос; фоновые задачи отдельно" : "voice estimate; backend billed separately"}{!finalized ? "*" : ""}</> : null}</p>;
}
