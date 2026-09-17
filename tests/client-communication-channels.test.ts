import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const shell = readFileSync("components/cabinet/CabinetShell.tsx", "utf8");
const home = readFileSync("app/(client)/cabinet/page.tsx", "utf8");
const support = readFileSync("app/(client)/cabinet/chat/page.tsx", "utf8");
const anham = readFileSync("app/(client)/cabinet/anham/page.tsx", "utf8");
const layout = readFileSync("app/(client)/cabinet/layout.tsx", "utf8");

describe("client communication channels", () => {
  it("shows Anham, Professor Python and Support as separate cabinet destinations", () => {
    expect(shell).toContain('href: `${root}/anham`');
    expect(shell).toContain('href: `${root}/dialog`');
    expect(shell).toContain('href: `${root}/chat`');
    expect(shell).toContain('label: ru ? "Анхам" : "Anham"');
    expect(shell).toContain('label: ru ? "Служба поддержки" : "Support"');
    expect(anham).toContain("Conversation with Anham");
    expect(support).not.toContain("SavedAssistantThread");
  });

  it("shows independent Professor and Support unread badges", () => {
    expect(layout).toContain("getUnreadForClient(caseId)");
    expect(layout).toContain("getClientSupportUnreadCount(auth.userId)");
    expect(shell).toContain("badge: unread");
    expect(shell).toContain("badge: supportUnread");
    expect(home).toContain("professorUnread");
    expect(home).toContain("supportUnread");
    expect(home.match(/unread-badge unread-badge--inline/g)).toHaveLength(2);
  });

  it("keeps all visible communication copy bilingual", () => {
    expect(home).toContain('support: "Служба поддержки"');
    expect(home).toContain('support: "Support"');
    expect(anham).toContain("Переписка с Анхамом");
    expect(anham).toContain("Conversation with Anham");
  });
});
