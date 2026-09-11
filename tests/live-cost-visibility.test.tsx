import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveUsage } from "@/components/assistant/LiveUsage";
import { canSeeVoicePilotCosts } from "@/lib/auth/require-founder";

describe("private voice pilot costs", () => {
  it.each(["ru", "en"] as const)("renders cost only for Anna in %s", locale => {
    for (const email of ["dubrovenkoanna@gmail.com", "DUBROVENKOANNA@GMAIL.COM", "karen@example.test", "client@example.test", "other-founder@example.test", null, undefined]) {
      const showCosts = canSeeVoicePilotCosts(email);
      const markup = renderToStaticMarkup(<LiveUsage locale={locale} showCosts={showCosts} seconds={90} usd={0.075} finalized={false} />);
      expect(markup).toContain("1:30");
      const anna = email?.toLowerCase() === "dubrovenkoanna@gmail.com";
      expect(markup.includes("$0.075")).toBe(anna);
      expect(markup.includes(locale === "ru" ? "Голосовой пилот" : "Voice pilot")).toBe(anna);
      expect(markup.includes(locale === "ru" ? "фоновые задачи отдельно" : "backend billed separately")).toBe(anna);
      expect(markup.includes(locale === "ru" ? "Длительность разговора" : "Conversation duration")).toBe(!anna);
    }
  });
});
