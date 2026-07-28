import { afterEach, describe, expect, it } from "vitest";
import {
  getDailyLimit,
  getGuestDailyTotalLimit,
  getPublicAssistantMode
} from "@/lib/assistant/guard";

const touched = [
  "PUBLIC_ASSISTANT_MODE",
  "ASSISTANT_DAILY_TOTAL_GUEST",
  "ASSISTANT_DAILY_LIMIT_GUEST"
];

afterEach(() => {
  for (const name of touched) {
    delete process.env[name];
  }
});

describe("public assistant mode", () => {
  it("is open by default", () => {
    expect(getPublicAssistantMode()).toBe("open");
  });

  it("accepts the two emergency values", () => {
    process.env.PUBLIC_ASSISTANT_MODE = "registered_only";
    expect(getPublicAssistantMode()).toBe("registered_only");

    process.env.PUBLIC_ASSISTANT_MODE = "OFF";
    expect(getPublicAssistantMode()).toBe("off");
  });

  it("falls back to open on a typo instead of silencing the assistant", () => {
    process.env.PUBLIC_ASSISTANT_MODE = "registred-only";
    expect(getPublicAssistantMode()).toBe("open");
  });
});

describe("daily limits", () => {
  it("uses the built-in caps when nothing is configured", () => {
    expect(getDailyLimit("guest")).toBe(15);
    expect(getDailyLimit("registered")).toBe(60);
    expect(getDailyLimit("client")).toBe(200);
    expect(getGuestDailyTotalLimit()).toBe(400);
  });

  it("can be raised or lowered from the environment", () => {
    process.env.ASSISTANT_DAILY_LIMIT_GUEST = "5";
    process.env.ASSISTANT_DAILY_TOTAL_GUEST = "1000";

    expect(getDailyLimit("guest")).toBe(5);
    expect(getGuestDailyTotalLimit()).toBe(1000);
  });

  it("ignores nonsense values rather than dropping the cap to zero", () => {
    process.env.ASSISTANT_DAILY_LIMIT_GUEST = "нет";
    expect(getDailyLimit("guest")).toBe(15);

    process.env.ASSISTANT_DAILY_LIMIT_GUEST = "0";
    expect(getDailyLimit("guest")).toBe(15);
  });
});
