export function sanitizeNextPath(
  value: string | string[] | FormDataEntryValue | null | undefined,
  fallback = "/cabinet"
): string {
  const candidate = String(Array.isArray(value) ? value[0] ?? "" : value ?? "");
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") || /[\u0000-\u001f\u007f]/.test(candidate)) return fallback;
  try {
    const parsed = new URL(candidate, "https://pythonmethodcenter.invalid");
    return parsed.origin === "https://pythonmethodcenter.invalid"
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
