import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  ATTACHMENT_READING_ACCURACY_RULE
} from "@/lib/assistant/prompts";
import {
  IMAGE_MAX_DIMENSION,
  IMAGE_QUALITY
} from "@/lib/assistant/attachments";

describe("high-fidelity analysis reading", () => {
  it("preserves enough image detail for small lab values", () => {
    expect(IMAGE_MAX_DIMENSION).toBeGreaterThanOrEqual(2400);
    expect(IMAGE_QUALITY).toBeGreaterThanOrEqual(0.9);
  });

  it("requires a second pass over every number and separates unreadable from absent", () => {
    expect(ATTACHMENT_READING_ACCURACY_RULE).toContain("второй раз сверь");
    expect(ATTACHMENT_READING_ACCURACY_RULE).toContain("десятичный разделитель");
    expect(ATTACHMENT_READING_ACCURACY_RULE).toContain("три разные категории");
    expect(ATTACHMENT_READING_ACCURACY_RULE.toLowerCase()).toContain("не повторяй");
  });

  it("gives both staff and client attachment reads enough output room", async () => {
    const [staff, client] = await Promise.all([
      readFile("app/api/assistant/staff/route.ts", "utf8"),
      readFile("app/api/assistant/client/route.ts", "utf8")
    ]);
    expect(staff).toContain("askClaude(system, messages, 5000, attachments)");
    expect(client).toContain("askClaude(system, messages, 5000, attachments)");
    expect(staff).toContain("ATTACHMENT_READING_ACCURACY_RULE");
    expect(client).toContain("ATTACHMENT_READING_ACCURACY_RULE");
  });

  it("keeps batch extraction and consolidation locale-complete", async () => {
    const chat = await readFile("components/assistant/AssistantChat.tsx", "utf8");
    expect(chat).toContain("Всё значимое читается");
    expect(chat).toContain("All material information is readable.");
    expect(chat).toContain("Do not call tests absent from the page unreadable");
  });
});
