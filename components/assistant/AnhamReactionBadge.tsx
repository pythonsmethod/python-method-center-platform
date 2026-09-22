import { ANHAM_REACTION_EMOJI, normalizeReaction } from "@/lib/assistant/reactions";
import type { Locale } from "@/lib/i18n/locale";

type AnhamReactionBadgeProps = {
  reaction: unknown;
  locale?: Locale;
};

// Anham's reaction to the person's message: one small badge tucked under the
// corner of their bubble, the way messengers do it. Not a message of its own,
// not part of what the person wrote. The key is mapped to an emoji here, so
// nothing but the allowlisted glyphs can ever be rendered.
export function AnhamReactionBadge({ reaction, locale = "ru" }: AnhamReactionBadgeProps) {
  const key = normalizeReaction(reaction);

  if (!key) {
    return null;
  }

  const emoji = ANHAM_REACTION_EMOJI[key];
  const label = locale === "ru" ? `Реакция Анхама: ${emoji}` : `Anham reacted: ${emoji}`;

  return (
    <span
      aria-label={label}
      className="assistant-msg__reaction"
      data-reaction={key}
      role="img"
      title={label}
    >
      {emoji}
    </span>
  );
}
