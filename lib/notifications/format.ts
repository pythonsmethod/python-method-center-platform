// Pure helpers for notification texts (unit-tested).

export const EXCERPT_MAX_CHARS = 160;

// Safe short fragment for external notifications: single line, hard cap.
// Full sensitive content stays in the database only.
export function truncateExcerpt(
  value: string | null | undefined,
  maxChars: number = EXCERPT_MAX_CHARS
): string | null {
  if (!value) {
    return null;
  }

  const singleLine = value.replace(/\s+/g, " ").trim();

  if (!singleLine) {
    return null;
  }

  if (singleLine.length <= maxChars) {
    return singleLine;
  }

  return `${singleLine.slice(0, maxChars - 1).trimEnd()}…`;
}

export function buildNotificationText(input: {
  title: string;
  lines: Array<string | null | undefined>;
  link?: string | null;
}): string {
  const parts = [
    `☥ ${input.title}`,
    ...input.lines.filter((line): line is string => Boolean(line && line.trim()))
  ];

  if (input.link) {
    parts.push(input.link);
  }

  return parts.join("\n");
}
