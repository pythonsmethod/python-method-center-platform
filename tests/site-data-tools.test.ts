import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const mocks = vi.hoisted(() => ({ service: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mocks.service }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: mocks.audit }));
import { runStaffDataTool } from "@/lib/assistant/site-data-tools";
import { SITE_DATASETS } from "@/lib/assistant/site-data-catalog";
import { runVoiceSiteTool } from "@/lib/assistant/voice-site-tools";
import type { VoiceActor } from "@/lib/assistant/realtime-server";

const id = "00000000-0000-4000-8000-000000000001";
const actor: VoiceActor = { profileId: id, email: "founder@example.test", scope: "founder", caseId: null, tier: "registered" };
const now = new Date("2026-09-09T19:00:00Z");
type Query = { table: string; calls: unknown[][] };
const queries: Query[] = [];
let respond: (query: Query) => object;
beforeEach(() => {
  queries.length = 0; mocks.audit.mockReset().mockResolvedValue({ status: "inserted" });
  respond = () => ({ data: [], count: 0, error: null });
  mocks.service.mockReturnValue({ from: (table: string) => {
    const query = { table, calls: [] as unknown[][] }; queries.push(query);
    const chain: Record<string, unknown> = { then: (resolve: (value: object) => unknown) => Promise.resolve(respond(query)).then(resolve) };
    for (const method of ["select", "eq", "filter", "in", "is", "not", "ilike", "order", "range", "maybeSingle"]) chain[method] = (...args: unknown[]) => { query.calls.push([method, ...args]); return chain; };
    return chain;
  } });
});
afterEach(() => vi.unstubAllEnvs());
const run = (name: string, args: object = {}, scope: VoiceActor["scope"] = "founder") => runStaffDataTool({ ...actor, scope }, name, args, "ru", now);

describe("catalog matches the repository's real business schema", () => {
  it("covers every current public business table, explicitly excluding retired and internal control tables", () => {
    const schema = new Map<string, Set<string>>();
    for (const name of readdirSync("supabase/migrations").filter(n => n.endsWith(".sql")).sort()) {
      const sql = readFileSync(join("supabase/migrations", name), "utf8").replace(/--[^\n]*/g, "");
      for (const [, table, body] of sql.matchAll(/create table (?:if not exists )?public\.(\w+)\s*\(([\s\S]*?)\n\);/g)) {
        const fields = schema.get(table) ?? new Set<string>();
        for (const line of body.split("\n")) { const m = line.trim().match(/^(\w+)\s+(?:uuid|text|jsonb|boolean|integer|smallint|bigint|numeric|double|real|date|timestamp|public\.)/); if (m) fields.add(m[1]); }
        schema.set(table, fields);
      }
      for (const [, table, body] of sql.matchAll(/alter table public\.(\w+)([\s\S]*?);/g)) {
        const fields = schema.get(table) ?? new Set<string>();
        for (const [, field] of body.matchAll(/add column (?:if not exists )?(\w+)/g)) fields.add(field);
        schema.set(table, fields);
      }
    }
    const covered = new Set(Object.values(SITE_DATASETS).map(d => d.table));
    // assistant_gap_* are the founder's internal knowledge-gap centre. They are
    // deliberately absent from the assistant's own site-data tools: the
    // assistant must not be able to read the record of its own refusals.
    expect([...schema.keys()].filter(t => !covered.has(t))).toEqual(expect.arrayContaining(["escalation_events", "assistant_usage", "assistant_client_actions", "assistant_gap_events", "assistant_gap_reads"]));
    expect([...schema.keys()].filter(t => !covered.has(t)).sort()).toEqual(["assistant_client_actions", "assistant_gap_events", "assistant_gap_reads", "assistant_usage", "escalation_events"]);
    for (const dataset of Object.values(SITE_DATASETS)) {
      expect(schema.has(dataset.table), dataset.table).toBe(true);
      for (const field of [...dataset.fields, dataset.key, dataset.order, ...dataset.numeric]) expect(schema.get(dataset.table)?.has(field), `${dataset.table}.${field}`).toBe(true);
    }
  });
  it("does not expose credentials, storage links, diagnostic payloads or retired classification", () => {
    for (const dataset of Object.values(SITE_DATASETS)) {
      expect(dataset.fields).not.toEqual(expect.arrayContaining(["storage_path"]));
      expect(dataset.fields.join(" ")).not.toMatch(/audio_path|raw_response_location|last_error|processor_reference|shipment_document_path|urgency/);
    }
    expect(SITE_DATASETS.cases.fields).not.toContain("status"); expect(SITE_DATASETS.support_requests.fields).not.toContain("status");
    expect(SITE_DATASETS.audit.fields).not.toContain("metadata"); expect(SITE_DATASETS.notifications.fields).not.toContain("payload");
  });
});

describe("broad staff read tools", () => {
  it.each(["founder", "karen"] as const)("allows %s to discover all business sources and read Professor correspondence", async scope => {
    const catalog = await run("site_data_catalog", {}, scope);
    expect(catalog).toMatchObject({ datasets: expect.arrayContaining([expect.objectContaining({ id: "questionnaires" }), expect.objectContaining({ id: "canonical_facts" }), expect.objectContaining({ id: "payments" })]) });
    await expect(run("query_site_records", { dataset: "professor_messages" }, scope)).resolves.toMatchObject({ source: "case_messages", totalMatches: 0 });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ actorId: id, action: "assistant.site_data.read" }));
  });
  it.each(["site_data_catalog", "query_site_records", "read_site_field", "summarize_site_records", "read_site_content"])("rejects clients before %s access", async name => {
    await expect(run(name, {}, "client")).rejects.toMatchObject({ status: 403 }); expect(queries).toEqual([]);
  });
  it.each([
    { dataset: "auth.users" }, { dataset: "__proto__" }, { dataset: "profiles", fields: ["*"] },
    { dataset: "documents", fields: ["storage_path"] }, { dataset: "cases", filters: [{ field: "urgency", op: "eq", value: "high" }] },
    { dataset: "payments", filters: [{ field: "amount_cents", op: "or", value: "x" }] },
    { dataset: "profiles", filters: [{ field: "email", op: "eq", value: { raw: "sql" } }] },
    { dataset: "profiles", orderBy: "id);drop table profiles" }, { dataset: "profiles", sql: "select *" }, { dataset: "profiles", offset: -1 },
  ])("rejects raw or out-of-catalog access %j", async args => {
    await expect(run("query_site_records", args)).rejects.toMatchObject({ status: 400 }); expect(queries).toEqual([]); expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("passes a name search as a literal filter and preserves missing source values", async () => {
    respond = () => ({ data: [{ id, full_name: "Synthetic", phone: null }], count: 1, error: null });
    const output = await run("query_site_records", { dataset: "profiles", fields: ["full_name", "phone"], filters: [{ field: "full_name", op: "contains", value: "O'Name_100%" }] });
    expect(queries[0].calls).toContainEqual(["ilike", "full_name", "%O'Name\\_100\\%%"]);
    expect(output).toMatchObject({ rows: [{ id, full_name: "Synthetic", phone: null }], totalMatches: 1 });
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain("O'Name");
  });
  it("bounds pages, preserves all rows through nextOffset and marks long text", async () => {
    respond = () => ({ data: [{ id, body: "x".repeat(2000) }], count: 21, error: null });
    expect(await run("query_site_records", { dataset: "professor_messages", fields: ["body"], offset: 10 })).toMatchObject({ nextOffset: 11, totalMatches: 21, rows: [{ id, body: { truncated: true, totalCharacters: 2000, readWith: "read_site_field" } }] });
    expect(queries[0].calls).toContainEqual(["range", 10, 19]);
  });
  it("countOnly uses exact database count without fetching content", async () => {
    respond = () => ({ data: null, count: 7301, error: null });
    expect(await run("query_site_records", { dataset: "payments", countOnly: true, filters: [{ field: "status", op: "eq", value: "paid" }] })).toMatchObject({ totalMatches: 7301, countExact: true, rows: [], nextOffset: null });
    expect(queries[0].calls).toContainEqual(["select", "id", { count: "exact", head: true }]);
  });
  it("fails closed on database or audit failure, including optional undeployed evidence tables", async () => {
    respond = () => ({ data: null, count: null, error: { message: "sensitive diagnostic" } });
    await expect(run("query_site_records", { dataset: "clinical_evidence" })).rejects.toMatchObject({ status: 503, message: "unavailable" });
    respond = () => ({ data: [{ id, body: "Sensitive synthetic" }], count: 1, error: null }); mocks.audit.mockResolvedValue({ status: "failed" });
    await expect(run("query_site_records", { dataset: "notes" })).rejects.toMatchObject({ status: 503 });
  });
  it("reads long existing extraction fields completely and detects revision changes", async () => {
    let content = "α".repeat(10000) + "END";
    respond = () => ({ data: { id, first_reading: content }, error: null });
    const first = await run("read_site_field", { dataset: "extractions", recordId: id, field: "first_reading" }) as { revision: string };
    expect(first).toMatchObject({ nextOffset: 10000, totalCharacters: 10003 });
    expect(await run("read_site_field", { dataset: "extractions", recordId: id, field: "first_reading", offset: 10000, revision: first.revision })).toMatchObject({ text: "END", nextOffset: null });
    content += "NEW";
    expect(await run("read_site_field", { dataset: "extractions", recordId: id, field: "first_reading", offset: 10000, revision: first.revision })).toMatchObject({ changed: true, restartFromOffset: 0 });
  });
  it("keeps original values, review state and actual provenance separate", async () => {
    const row = { id, value_original: "4,8", value_numeric: 4.8, unit_original: "mmol/L", verification_status: "NEEDS_REVIEW", source_page: 2, source_coordinates: null, token_provenance: null };
    respond = () => ({ data: [row], count: 1, error: null });
    expect(await run("query_site_records", { dataset: "canonical_facts", fields: Object.keys(row) })).toMatchObject({ rows: [row], caution: expect.stringContaining("Source extraction") });
  });
  it("routes voice reads with the signed local day and active locale", async () => {
    expect(await runVoiceSiteTool(actor, "read_site_content", { section: "service_prices" }, "America/Los_Angeles", now, "en")).toMatchObject({ locale: "en", date: "2026-09-09", timeZone: "America/Los_Angeles", text: expect.stringContaining('"fiveWeeksTotal":1440') });
  });
});

describe("exact bounded operational summaries", () => {
  it("sums decimal values without floating-point drift and separates payment currencies", async () => {
    respond = () => ({ data: [{ id: "a", amount_cents: "0.1", currency: "USD" }, { id: "b", amount_cents: "0.2", currency: "USD" }, { id: "c", amount_cents: "2", currency: "EUR" }], count: 3, error: null });
    expect(await run("summarize_site_records", { dataset: "payments", sumField: "amount_cents" })).toMatchObject({ totalMatches: 3, complete: true, groupBy: ["currency"], groups: [{ values: ["USD"], count: 2, sum: "0.3" }, { values: ["EUR"], count: 1, sum: "2" }] });
  });
  it("paginates every row up to its bound for complete grouped counts", async () => {
    respond = q => {
      const start = q.calls.find(c => c[0] === "range")![1] as number;
      return { data: Array.from({ length: start === 0 ? 1000 : 2 }, (_, i) => ({ id: String(start + i), country_code: i % 2 ? "US" : "CA" })), count: 1002, error: null };
    };
    expect(await run("summarize_site_records", { dataset: "deliveries", groupBy: ["country_code"] })).toMatchObject({ totalMatches: 1002, complete: true, groups: [{ values: ["CA"], count: 501 }, { values: ["US"], count: 501 }] }); expect(queries).toHaveLength(2);
  });
  it("does not return a partial sum for over-broad input", async () => {
    respond = () => ({ data: [], count: 5001, error: null });
    expect(await run("summarize_site_records", { dataset: "payments", sumField: "amount_cents" })).toMatchObject({ needsNarrowerFilter: true, aggregate: null, totalMatches: 5001 });
  });
  it("rejects unsafe integers instead of rounding money", async () => {
    respond = () => ({ data: [{ id, amount_cents: 9007199254740992, currency: "USD" }], count: 1, error: null });
    await expect(run("summarize_site_records", { dataset: "payments", sumField: "amount_cents" })).rejects.toMatchObject({ status: 503 });
  });
  it("does not conflate all-null measurements with zero", async () => {
    respond = () => ({ data: [{ id, value: null }], count: 1, error: null });
    expect(await run("summarize_site_records", { dataset: "metrics", sumField: "value" })).toMatchObject({ groups: [{ count: 1, sum: null, nonNullValues: 0 }] });
  });
});

describe("actual site content", () => {
  it.each(["ru", "en"] as const)("reads localized %s page and legal content", async locale => {
    const list = await runStaffDataTool(actor, "read_site_content", {}, locale, now);
    expect(list).toMatchObject({ sections: expect.arrayContaining(["landing", "payment", "legal_offer", "legal_privacy", "shop_catalog", "service_prices"]) });
    expect(await runStaffDataTool(actor, "read_site_content", { section: "legal_offer" }, locale, now)).toMatchObject({ locale, text: expect.stringContaining(locale === "ru" ? "ДОГОВОР" : "OFFER") });
  });
  it("reports runtime presence without revealing a credential or asserting provider health", async () => {
    vi.stubEnv("OPENAI_API_KEY", "synthetic-secret-never-return");
    const output = await run("read_site_content", { section: "runtime_availability" });
    expect(JSON.stringify(output)).not.toContain("synthetic-secret-never-return"); expect(output).toMatchObject({ text: expect.stringContaining('"textOpenAIConfigured":true') }); expect(queries).toEqual([]);
  });
});
