// Opt-in only: existing providers receive synthetic conversation text, no PHI.
import { expect, it, vi } from "vitest";
import { loadEnvFile } from "node:process";
import path from "node:path";
if (process.env.ANHAM_TEST_ENV_FILE) loadEnvFile(path.resolve(process.env.ANHAM_TEST_ENV_FILE));
const f = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => {
  const chain = { select: () => chain, eq: () => chain, in: () => chain, is: () => chain,
    abortSignal: () => chain, ilike: () => chain, order: () => chain, limit: () => chain,
    then: (resolve: (value: unknown) => unknown) => {
      f.read(); return Promise.resolve({ error: null, data: [{ id: "00000000-0000-4000-8000-000000000001", role: "user", case_id: null, content: "Synthetic project code: cedar-482. This is a test fixture, not a real conversation.", created_at: "2001-01-01", message_sequence: 1, source: "voice_transcript", voice_state: "completed", locale: "en" }] }).then(resolve);
    } };
  return { from: () => chain };
} }));
import { askOpenAi } from "@/lib/assistant/openai";
import { askClaude } from "@/lib/assistant/claude";
import { withConversationArchive } from "@/lib/assistant/conversation-archive";
it.each([["OpenAI", askOpenAi], ["Claude", askClaude]] as const)("%s retrieves a synthetic old voice record through native tools", async (_name, ask) => {
  f.read.mockClear();
  const originalFetch = globalThis.fetch;
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (...args) => {
    const response = await originalFetch(...args);
    if (!response.ok) {
      const error = (await response.clone().json().catch(() => ({})))?.error;
      // Safe API diagnostics only, never headers, keys or raw error messages.
      console.error(JSON.stringify({ status: response.status, code: error?.code, type: error?.type, param: error?.param }));
    }
    return response;
  });
  const result = await withConversationArchive({ profileId: "synthetic", private: true, caseId: null }, () => ask(
    "This is a synthetic integration test. Call search_conversation_history with query empty to retrieve the old message, then state its project code. Do not invent a code.",
    [{ role: "user", content: "What was my project code in the old conversation?" }], 1400));
  spy.mockRestore();
  expect(result.status).toBe("ok");
  expect(f.read).toHaveBeenCalled();
  if (result.status === "ok") expect(result.reply).toContain("cedar-482");
});
