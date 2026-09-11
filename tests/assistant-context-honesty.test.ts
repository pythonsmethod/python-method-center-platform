import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { from, authClient, queries, reads } = vi.hoisted(() => ({
  from: vi.fn(), authClient: vi.fn(), queries: [] as Array<{ data: unknown; error: unknown }>,
  reads: [] as Array<{ table: string; fields: string; filters: Array<[string, unknown]>; limit: number | null }>
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: authClient }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => ({ from }) }));
import { resolveAssistantAudience, resolveAssistantTierForUi } from "@/lib/assistant/tiers";

const ok = (data: unknown) => ({ data, error: null });
const failed = () => ({ data: null, error: { message: "offline" } });
const caseRow = { id: "synthetic-case", created_at: "2026-09-01", direction: "recovery", status: "in_review" };
// The audience resolver reads these in a fixed order; the queue answers them
// in the same order, so a helper keeps each test's intent readable.
const audienceQueries = (options: {
  case?: { data: unknown; error: unknown };
  activeSupport?: { data: unknown; error: unknown };
  payments?: { data: unknown; error: unknown };
  periods?: { data: unknown; error: unknown };
  caseSections?: Array<{ data: unknown; error: unknown }>;
} = {}) => {
  queries.push(options.case ?? ok(null), options.activeSupport ?? ok([]), options.payments ?? ok([]), options.periods ?? ok([]));
  if (!options.case?.data) return;
  const sections = options.caseSections ?? [ok([]), ok([]), ok([])];
  queries.push(...sections);
};
const paidPayment = { product: "support_5_weeks", status: "paid", amount_cents: 144000, currency: "USD", paid_at: "2026-08-28T10:00:00.000Z", created_at: "2026-08-28T09:59:00.000Z" };
const recordedPeriod = { product: "support_5_weeks", status: "scheduled", starts_at: "2026-09-01T00:00:00.000Z", ends_at: "2026-10-06T00:00:00.000Z" };

beforeEach(() => {
  vi.stubEnv("ANHAM_CLIENT_VOICE_TEST_EMAILS", "");
  queries.length = 0;
  reads.length = 0;
  authClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "synthetic-user", email: "test@example.invalid" } } }) } });
  from.mockImplementation((table: string) => {
    const result = queries.shift();
    const read = { table, fields: "", filters: [] as Array<[string, unknown]>, limit: null as number | null };
    reads.push(read);
    const chain: Record<string, unknown> = {};
    chain.select = (fields: unknown) => { read.fields = typeof fields === "string" ? fields : ""; return chain; };
    chain.eq = (column: unknown, value: unknown) => { read.filters.push([String(column), value]); return chain; };
    chain.limit = (value: unknown) => { read.limit = typeof value === "number" ? value : null; return chain; };
    for (const method of ["gt", "in", "order", "maybeSingle"]) chain[method] = () => chain;
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
    authorize(); audienceQueries({ case: ok(caseRow) });
    const audience = await resolveAssistantAudience();
    expect(audience.tier).toBe("client");
    expect(audience.caseId).toBe(caseRow.id);
    expect(audience.sources.find(s => s.id === "active_support")?.availability).toBe("absent");
    expect(audience.sources.find(s => s.id === "payments")?.availability).toBe("absent");
    expect(audience.sources.find(s => s.id === "service_periods")?.availability).toBe("absent");
    expect(audience.sources.find(s => s.id === "assistant_preview")?.scope).toContain("NOT proof of payment");
  });
  it("enables the same attachment tier in the UI", async () => {
    authorize(); queries.push(ok([]));
    expect(await resolveAssistantTierForUi()).toBe("client");
  });
  it("does not grant the preview to unconfirmed emails", async () => {
    authorize(false); audienceQueries();
    expect((await resolveAssistantAudience()).tier).toBe("registered");
  });
  it("revokes the full preview when removed from the allowlist", async () => {
    authorize(); vi.stubEnv("ANHAM_CLIENT_VOICE_TEST_EMAILS", ""); audienceQueries();
    expect((await resolveAssistantAudience()).tier).toBe("registered");
  });
});

describe("connected assistant context with unavailable data", () => {
  it("distinguishes query failure from confirmed absence and never grants paid access on error", async () => {
    audienceQueries({ case: failed(), activeSupport: failed() });
    const audience = await resolveAssistantAudience();
    expect(audience.tier).toBe("registered");
    expect(audience.sources.find((s) => s.id === "case")).toMatchObject({ availability: "unavailable", data: null });
    expect(audience.sources.find((s) => s.id === "active_support")).toMatchObject({ availability: "unavailable", data: null });
  });
  it("retains a successful absent result without inferring payment or questionnaire facts", async () => {
    audienceQueries();
    const { sources } = await resolveAssistantAudience();
    expect(sources.find((s) => s.id === "case")?.availability).toBe("absent");
    expect(sources.find((s) => s.id === "payments")?.availability).toBe("absent");
  });
  it("marks each failed section unknown and excludes retired processing classifications", async () => {
    audienceQueries({ case: ok(caseRow), caseSections: [failed(), failed(), failed()] });
    const { context, sources } = await resolveAssistantAudience();
    for (const id of ["documents", "events", "support_history"]) expect(sources.find((s) => s.id === id)).toMatchObject({ availability: "unavailable", data: null });
    expect(context).not.toContain("in_review");
  });
  it("does not report a limited sample as a total or imply human review", async () => {
    audienceQueries({ case: ok(caseRow), caseSections: [ok([{ id: "doc", original_filename: "synthetic.txt", created_at: "2026-09-01" }]), ok([]), ok([])] });
    const { sources } = await resolveAssistantAudience();
    expect(sources.find((s) => s.id === "documents")).toMatchObject({ humanReviewed: null, recordedAt: null, data: { sample_count: 1 } });
    expect(sources.find((s) => s.id === "documents")?.scope).toContain("NOT total");
    expect(sources.find((s) => s.id === "documents")?.scope).toContain("metadata_only");
  });
});

// The person's own money question — "did it go through, and until when am I
// accompanied?" — answered from records, with the four dishonest shortcuts
// (guessed dates, read failure as absence, paid status as an opened period,
// someone else's rows) closed off.
describe("own payment history and recorded support periods", () => {
  it("shows a recorded paid payment and the recorded period boundaries", async () => {
    audienceQueries({ payments: ok([paidPayment]), periods: ok([recordedPeriod]) });
    const { sources, context } = await resolveAssistantAudience();
    expect(sources.find((s) => s.id === "payments")).toMatchObject({ kind: "system_record", availability: "available", data: { sample_count: 1, rows: [paidPayment] } });
    expect(sources.find((s) => s.id === "service_periods")).toMatchObject({ availability: "available", data: { rows: [recordedPeriod] } });
    expect(context).toContain("2026-09-01T00:00:00.000Z");
    expect(context).toContain("2026-10-06T00:00:00.000Z");
    expect(context).toContain("\"status\":\"paid\"");
  });

  it("carries every payment status the system records", async () => {
    const statuses = ["paid", "pending", "failed", "refunded", "partially_refunded"];
    audienceQueries({ payments: ok(statuses.map((status) => ({ ...paidPayment, status }))) });
    const { sources } = await resolveAssistantAudience();
    const rows = (sources.find((s) => s.id === "payments")?.data as { rows: Array<{ status: string }> }).rows;
    expect(rows.map((row) => row.status)).toEqual(statuses);
  });

  it("never projects a processor reference, transaction metadata or card data", async () => {
    audienceQueries({ payments: ok([{ ...paidPayment, processor_reference: "pi_synthetic_reference", metadata: { card_last4: "4242" } }]) });
    const { sources, context } = await resolveAssistantAudience();
    // The projection is what protects this: the select list, not a filter
    // applied afterwards, is what a leak would have to get past.
    const paymentsRead = reads.find((read) => read.table === "payments");
    expect(paymentsRead?.fields).toBe("product, status, amount_cents, currency, paid_at, created_at");
    expect(paymentsRead?.limit).toBe(20);
    expect(sources.find((s) => s.id === "payments")?.scope).toContain("no processor reference");
    expect(JSON.stringify(sources)).not.toContain("processor_reference");
    expect(context).not.toContain("pi_synthetic_reference");
    expect(context).not.toContain("4242");
  });

  it("reads only the signed-in profile's own records", async () => {
    audienceQueries({ case: ok(caseRow), payments: ok([paidPayment]), periods: ok([recordedPeriod]) });
    await resolveAssistantAudience();
    for (const table of ["payments", "service_periods"]) {
      for (const read of reads.filter((entry) => entry.table === table)) {
        expect(read.filters.some(([column, value]) => column === "profile_id" && value === "synthetic-user")
          || read.filters.some(([column, value]) => column === "case_id" && value === caseRow.id)).toBe(true);
        expect(read.filters.every(([, value]) => value !== "other-profile")).toBe(true);
      }
    }
    expect(reads.every((read) => read.filters.every(([column, value]) =>
      column !== "profile_id" || value === "synthetic-user"))).toBe(true);
  });

  it("marks a failed payment read unavailable rather than absent", async () => {
    audienceQueries({ payments: failed(), periods: failed() });
    const { sources } = await resolveAssistantAudience();
    expect(sources.find((s) => s.id === "payments")).toMatchObject({ availability: "unavailable", data: null });
    expect(sources.find((s) => s.id === "service_periods")).toMatchObject({ availability: "unavailable", data: null });
  });

  it("marks a successful empty payment read absent", async () => {
    audienceQueries();
    const { sources } = await resolveAssistantAudience();
    expect(sources.find((s) => s.id === "payments")?.availability).toBe("absent");
    expect(sources.find((s) => s.id === "service_periods")?.availability).toBe("absent");
  });

  it("does not turn a paid payment into an active service period or a paid tier", async () => {
    audienceQueries({ payments: ok([paidPayment]) });
    const audience = await resolveAssistantAudience();
    expect(audience.tier).toBe("registered");
    expect(audience.sources.find((s) => s.id === "active_support")?.availability).toBe("absent");
    expect(audience.sources.find((s) => s.id === "service_periods")?.availability).toBe("absent");
    expect(audience.sources.find((s) => s.id === "payments")?.scope).toContain("NOT proof of an active service period");
  });

  it("keeps the period source free of any claim to prove payment", async () => {
    audienceQueries({ periods: ok([recordedPeriod]) });
    const { sources } = await resolveAssistantAudience();
    expect(sources.find((s) => s.id === "service_periods")?.scope).toContain("never calculated");
    expect(sources.find((s) => s.id === "service_periods")?.scope).toContain("NOT proof of payment");
  });

  it("never names a model vendor in the client's own context", async () => {
    audienceQueries({ case: ok(caseRow), payments: ok([paidPayment]), periods: ok([recordedPeriod]) });
    const { context } = await resolveAssistantAudience();
    expect(context).not.toMatch(/claude|gpt|openai|anthropic/i);
  });
});
