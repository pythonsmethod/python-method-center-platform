import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const thread = readFileSync("components/support/SupportRequestThread.tsx", "utf8");
const queries = readFileSync("lib/support/queries.ts", "utf8");
const actions = readFileSync("lib/support/actions.ts", "utf8");

describe("support conversation history and timestamps", () => {
  it("persists each reply as a new message and reloads stored history", () => {
    expect(actions).toContain('.from("support_request_messages")');
    expect(actions).toContain(".insert({");
    expect(queries).toContain('select("id, support_request_id, sender_role, body, created_at")');
    expect(queries).toContain('.order("created_at", { ascending: true })');
  });

  it("shows WhatsApp-style day separators and each message time", () => {
    expect(thread).toContain('return locale === "ru" ? "Сегодня" : "Today"');
    expect(thread).toContain('return locale === "ru" ? "Вчера" : "Yesterday"');
    expect(thread).toContain("dateTime={message.created_at}");
    expect(thread).toContain("toLocaleTimeString(locale");
    expect(thread).toContain("fullDateTime(message.created_at, locale)");
  });
});
