// Shared display contract. Provider text is data: never HTML or executable Markdown.
export type WebCitation = { title: string; url: string; start: number; end: number };
export type WebResult = { text: string; citations: WebCitation[]; searchedAt: string };
export function publicSourceUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 700) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port || !host.includes(".") || host.includes(":") || /^\d+(\.\d+){3}$/.test(host) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)) return null;
    return url.href;
  } catch { return null; }
}
export function validWebResult(value: unknown): value is WebResult {
  if (!value || typeof value !== "object") return false;
  const r = value as WebResult;
  return typeof r.text === "string" && r.text.length > 0 && r.text.length <= 3500 && typeof r.searchedAt === "string" && Number.isFinite(Date.parse(r.searchedAt)) && Array.isArray(r.citations) && r.citations.length > 0 && r.citations.length <= 5 && r.citations.every(c => c && typeof c.title === "string" && c.title.length <= 150 && publicSourceUrl(c.url) === c.url && Number.isInteger(c.start) && Number.isInteger(c.end) && c.start >= 0 && c.end > c.start && c.end <= r.text.length);
}
