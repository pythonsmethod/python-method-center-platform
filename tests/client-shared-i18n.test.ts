import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("client shared controls follow the active locale", () => {
  it("localizes onboarding logout and emergency copy", () => {
    const page = readFileSync("app/(client)/onboarding/page.tsx", "utf8");

    expect(page).toContain("<LogoutButton label={strings.cabinet.logout} />");
    expect(page).toContain(
      "<EmergencyNotice text={strings.support.emergencyText} />"
    );
  });

  it("localizes the same shared controls in cabinet screens", () => {
    const account = readFileSync(
      "app/(client)/cabinet/account/page.tsx",
      "utf8"
    );
    const chat = readFileSync("app/(client)/cabinet/chat/page.tsx", "utf8");

    expect(account).toContain("<LogoutButton label={dict.logout} />");
    expect(chat).toContain(
      "<EmergencyNotice text={strings.support.emergencyText} />"
    );
  });
});
