import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askOpenAi } from "@/lib/assistant/openai";
import { providerPolicyRefusal } from "@/lib/assistant/policy-refusal";
const blocked = () => new Response(JSON.stringify({ error: { code: "cyber_policy", type: "invalid_request_error", message: "untrusted details" } }), { status: 400 });
const messages = [{ role: "user" as const, content: "synthetic" }];
let fetchMock = vi.fn();
beforeEach(() => { vi.stubEnv("OPENAI_API_KEY", "test-only"); fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("explicit provider policy refusals", () => {
  it("converts the observed block without exposing error details", async () => {
    fetchMock.mockResolvedValue(blocked());
    expect(await askOpenAi("system", messages, 100)).toEqual(providerPolicyRefusal());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([401, 403, 429, 500])("keeps HTTP %s as an operational error", async status => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { code: "cyber_policy", type: "invalid_request_error" } }), { status }));
    expect((await askOpenAi("system", messages, 100)).status).toBe("error");
  });
  it.each(["invalid_api_key", "model_not_found", "context_length_exceeded"])("does not disguise %s as a refusal", async code => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { code, type: "invalid_request_error" } }), { status: 400 }));
    expect((await askOpenAi("system", messages, 100)).status).toBe("error");
  });
  it.each([{ finish_reason: "content_filter", message: { content: "unsafe partial" } }, { message: { refusal: "provider text", content: "unsafe partial" } }])("discards filtered output", async choice => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ choices: [choice] })));
    expect(await askOpenAi("system", messages, 100)).toEqual(providerPolicyRefusal());
  });
  it("discards partial text when continuation is blocked", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content: "partial" } }] }))).mockResolvedValueOnce(blocked());
    expect(await askOpenAi("system", messages, 100)).toEqual(providerPolicyRefusal());
  });
  it("keeps malformed errors as operational failures", async () => {
    fetchMock.mockResolvedValue(new Response("not JSON", { status: 400 }));
    expect((await askOpenAi("system", messages, 100)).status).toBe("error");
  });
});
