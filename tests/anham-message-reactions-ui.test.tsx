import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AnhamReactionBadge } from "@/components/assistant/AnhamReactionBadge";
import { SavedAssistantThread } from "@/components/assistant/SavedAssistantThread";
import type { AssistantHistoryMessage } from "@/lib/assistant/history";

const messages: AssistantHistoryMessage[] = [
  { id: "q1", role: "user", content: "Я сегодня наконец-то прошёл 5000 шагов", created_at: "2026-09-18T10:00:00Z", locale: "ru", message_sequence: 1, reaction: "clap" },
  { id: "a1", role: "assistant", content: "Пять тысяч шагов, это заметный шаг вперёд.", created_at: "2026-09-18T10:00:05Z", locale: "ru", message_sequence: 2, reaction: null },
  { id: "q2", role: "user", content: "Сколько стоит сопровождение?", created_at: "2026-09-18T10:01:00Z", locale: "ru", message_sequence: 3, reaction: null },
  { id: "a2", role: "assistant", content: "Сопровождение на 5 недель стоит 1440 долларов.", created_at: "2026-09-18T10:01:05Z", locale: "ru", message_sequence: 4 }
];

describe("Anham reaction badge", () => {
  it("renders only allowlisted keys as emoji with a localized label", () => {
    expect(renderToStaticMarkup(<AnhamReactionBadge reaction="clap" locale="ru" />)).toContain('aria-label="Реакция Анхама: 👏"');
    expect(renderToStaticMarkup(<AnhamReactionBadge reaction="heart" locale="en" />)).toContain('aria-label="Anham reacted: ❤️"');
    expect(renderToStaticMarkup(<AnhamReactionBadge reaction="clap" locale="en" />)).toContain('data-reaction="clap"');
  });

  it("renders nothing for a missing, unknown or raw-emoji value", () => {
    for (const value of [null, undefined, "", "fire", "👏", "<img src=x>"]) {
      expect(renderToStaticMarkup(<AnhamReactionBadge reaction={value} locale="ru" />)).toBe("");
    }
  });
});

describe("saved conversation with reactions", () => {
  it("shows a stored reaction on the person's message only, after a reload", () => {
    const html = renderToStaticMarkup(<SavedAssistantThread messages={messages} emptyText="—" viewer="client" locale="ru" />);
    expect(html.match(/assistant-msg__reaction/g)).toHaveLength(1);
    expect(html.match(/assistant-msg--reacted/g)).toHaveLength(1);
    expect(html).toContain("Реакция Анхама: 👏");
    // The badge lives inside the user's bubble, not as a separate message.
    expect(html.match(/class="assistant-msg /g)).toHaveLength(4);
    const reacted = html.indexOf("assistant-msg--reacted");
    expect(html.indexOf("assistant-msg__reaction")).toBeGreaterThan(reacted);
    expect(html.indexOf("assistant-msg__reaction")).toBeLessThan(html.indexOf('id="a1"') === -1 ? html.indexOf("Пять тысяч шагов") : html.indexOf('id="a1"'));
  });

  it("uses the English label for the English interface", () => {
    const html = renderToStaticMarkup(<SavedAssistantThread messages={messages} emptyText="—" viewer="staff" locale="en" />);
    expect(html).toContain("Anham reacted: 👏");
    expect(html).not.toContain("Реакция Анхама");
  });
});

describe("reaction badge styling", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("attaches the badge to the bubble without widening it", () => {
    expect(css).toMatch(/\.assistant-msg--user \{[^}]*position: relative;/);
    expect(css).toMatch(/\.assistant-msg__reaction \{[^}]*position: absolute;/);
    expect(css).toMatch(/\.assistant-msg--reacted \{[^}]*margin-bottom: 10px;/);
  });
});
