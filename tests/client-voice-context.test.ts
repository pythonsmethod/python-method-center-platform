import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ audience: vi.fn(), registered: vi.fn(), paid: vi.fn() }));
vi.mock("@/lib/assistant/tiers", () => ({ resolveAssistantAudience: f.audience }));
vi.mock("@/lib/assistant/prompts", () => ({ buildRegisteredSystemPrompt: f.registered, buildPaidClientSystemPrompt: f.paid, platformContext: () => "" }));
import { clientVoiceInstructions } from "@/lib/assistant/client-voice-context";
import type { VoiceActor } from "@/lib/assistant/realtime-server";
const actor: VoiceActor = { profileId: "own", caseId: "own-case", email: "client@example.test", scope: "client", tier: "registered" };
beforeEach(() => { vi.resetAllMocks(); f.audience.mockResolvedValue({ profileId: "own", caseId: "own-case", tier: "registered", context: "Own source context" }); f.registered.mockResolvedValue("Client rules"); });
describe("client voice case isolation", () => {
  it("uses the full client prompt for a server-authorized client tier", async () => {
    f.audience.mockResolvedValue({ profileId: "own", caseId: "own-case", tier: "client", context: "Own source context with preview grant" });
    f.paid.mockResolvedValue("Full client rules");
    const instructions = await clientVoiceInstructions(new Request("https://test.local"), { ...actor, tier: "client" }, "en");
    expect(f.paid).toHaveBeenCalledWith("Own source context with preview grant");
    expect(f.registered).not.toHaveBeenCalled();
    expect(instructions).toContain("English");
    expect(instructions).toContain("There are no staff tools");
  });
  it("reuses the registered client context without upgrading paid entitlements", async () => {
    const instructions = await clientVoiceInstructions(new Request("https://test.local"), actor, "ru");
    expect(f.registered).toHaveBeenCalledWith("Own source context"); expect(f.paid).not.toHaveBeenCalled();
    expect(instructions).toContain("Russian"); expect(instructions).toContain("There are no staff tools");
  });
  it.each([{ profileId: "other", caseId: "own-case", tier: "registered" }, { profileId: "own", caseId: "other-case", tier: "registered" }, { profileId: null, caseId: null, tier: "guest" }])("rejects mismatched or unauthenticated context", async audience => {
    f.audience.mockResolvedValue(audience);
    await expect(clientVoiceInstructions(new Request("https://test.local"), actor, "en")).rejects.toMatchObject({ status: 403 });
    expect(f.registered).not.toHaveBeenCalled();
  });
});
