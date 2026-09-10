import { validWebResult } from "@/lib/assistant/web-results";
import type { Locale } from "@/lib/i18n/locale";
import type { ReactNode } from "react";

export function VoiceWebResults({ results, locale }: { results?: unknown; locale: Locale }) {
  if (!Array.isArray(results)) return null;
  return results.filter(validWebResult).slice(0, 3).map((result, index) => {
    const parts: ReactNode[] = []; let end = 0;
    for (const [i, citation] of [...result.citations].sort((a, b) => a.start - b.start).entries()) {
      if (citation.start < end) continue;
      parts.push(result.text.slice(end, citation.start));
      parts.push(<a key={i} href={citation.url} target="_blank" rel="noopener noreferrer" title={citation.title}>[{citation.title}]</a>);
      end = citation.end;
    }
    parts.push(result.text.slice(end));
    return <div className="assistant-web-result" key={`${result.searchedAt}:${index}`}>
      <small>{locale === "ru" ? "Результат интернет-поиска · " : "Web search result · "}{new Date(result.searchedAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-US", { timeZone: "UTC" })} UTC</small>
      <p>{parts}</p>
    </div>;
  });
}
