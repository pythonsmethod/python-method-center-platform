import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { from, authClient, queries } = vi.hoisted(() => ({
  from: vi.fn(), authClient: vi.fn(), queries: [] as Array<{ data: unknown; error: unknown }>
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: authClient }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => ({ from }) }));
import { resolveAssistantAudience, resolveAssistantTierForUi } from "@/lib/assistant/tiers";

const ok = (data: unknown) => ({ data, error: null });
const failed = () => ({ data: null, error: { message: "offline" } });
const caseRow = { id: "synthetic-case", created_at: "2026-09-01", direction: "recovery", status: "in_review" };

beforeEach(() => {
  vi.stubEnv("ANHAM_CLIENT_VOICE_TEST_EMAILS", "");
  queries.length = 0;
  authClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "synthetic-user", email: "test@example.invalid" } } }) } });
  from.mockImplementation(() => {
    const result = queries.shift();
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "gt", "in", "order", "limit", "maybeSingle"]) chain[method] = () => chain;
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return chain;
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("owner-authorized full client assistant preview", () => {
  function authorize(confirmed = true) {
    vi.stubEnv("ANHAM_CLIENT_VOICE_TEST_EMAILS", "test@example.invalid");
    authClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "synthetic-user", email: "test@example.invalid", email_confirmed_at: confirmed ? "2026-09-09" : null } } }) } });
  }
  it("grants full assistant capabilities without inventing payment or support", async () => {
    authorize(); queries.push(ok(caseRow), ok([]), ok([]), ok([]), ok([]));
    const audience = await resolveAssistantAudience();
    expect(audience.tier).toBe("client");
    expect(audience.caseId).toBe(caseRow.id);
    expect(audience.sources.find(s => s.id === "active_support")?.availability).toBe("absent");
    expect(audience.sources.find(s => s.id === "payments")?.availability).toBe("not_connected");
    expect(audience.sources.find(s => s.id === "assistant_preview")?.scope).toContain("NOT proof of payment");
  });
  it("enables the same attachment tier in the UI", async () => {
    authorize(); queries.push(ok([]));
    expect(await resolveAssistantTierForUi()).toBe("client");
  });
  it("does not grant the preview to unconfirmed emails", async () => {
    authorize(false); queries.push(ok(null), ok([]));
    expect((await resolveAssistantAudience()).tier).toBe("registered");
  });
  it("revokes the full preview when removed from the allowlist", async () => {
    authorize(); vi.stubEnv("ANHAM_CLIENT_VOICE_TEST_EMAILS", ""); queries.push(ok(null), ok([]));
    expect((await resolveAssistantAudience()).tier).toBe("registered");
  });
});

describe("connected assistant context with unavailable data", () => {
  it("distinguishes query failure from confirmed absence and never grants paid access on error", async () => {
    queries.push(failed(), failed());
    const audience = await resolveAssistantAudience();
    expect(audience.tier).toBe("registered");
    expect(audience.sources.find((s) => s.id === "case")).toMatchObject({ availability: "unavailable", data: null });
    expect(audience.sources.find((s) => s.id === "active_support")).toMatchObject({ availability: "unavailable", data: null });
  });
  it("retains a successful absent result without inferring payment or questionnaire facts", async () => {
    queries.push(ok(null), ok([]));
    const { sources } = await resolveAssistantAudience();
    expect(sources.find((s) => s.id === "case")?.availability).toBe("absent");
    expect(sources.find((s) => s.id === "payments")?.availability).toBe("not_connected");
  });
  it("marks each failed section unknown and excludes retired processing classifications", async () => {
    queries.push(ok(caseRow), ok([]), failed(), failed(), failed());
    const { context, sources } = await resolveAssistantAudience();
    for (const id of ["documents", "events", "support_history"]) expect(sources.find((s) => s.id === id)).toMatchObject({ availability: "unavailable", data: null });
    expect(context).not.toContain("in_review");
  });
  it("does not report a limited sample as a total or imply human review", async () => {
    queries.push(ok(caseRow), ok([]), ok([{ id: "doc", original_filename: "synthetic.txt", created_at: "2026-09-01" }]), ok([]), ok([]));
    const { sources } = await resolveAssistantAudience();
    expect(sources.find((s) => s.id === "documents")).toMatchObject({ humanReviewed: null, recordedAt: null, data: { sample_count: 1 } });
    expect(sources.find((s) => s.id === "documents")?.scope).toContain("NOT total");
    expect(sources.find((s) => s.id === "documents")?.scope).toContain("metadata_only");
  });
});
