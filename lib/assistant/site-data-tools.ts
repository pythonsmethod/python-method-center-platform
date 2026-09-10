import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { writeAuditLog } from "@/lib/audit/log";
import { createHash } from "node:crypto";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { OFFER_CONTENT } from "@/lib/legal/offer-content";
import { PRIVACY_CONTENT, REFUND_CONTENT } from "@/lib/legal/policy-content";
import { SHOP_CATALOG, SHOP_SECTIONS } from "@/lib/shop/catalog";
import { getPaymentPlans, PLAN_5W_TOTAL_USD, PLAN_100D_TOTAL_USD, REVIEW_TOTAL_USD } from "@/lib/payments/config";
import type { Locale } from "@/lib/i18n/locale";
import { SITE_DATASETS, SITE_DATA_BOUNDARY, type SiteDataset } from "./site-data-catalog";
import { VoiceFailure, type VoiceActor } from "./realtime-server";

const properties = {
  dataset: { type: "string", description: "Dataset ID returned by site_data_catalog." },
  filters: { type: "array", maxItems: 12, items: { type: "object", properties: { field: { type: "string" }, op: { type: "string", enum: ["eq", "neq", "gte", "gt", "lte", "lt", "contains", "in", "is_null", "not_null"] }, value: { description: "Scalar value, or an array of at most 50 scalars for in. Omit for null checks." } }, required: ["field", "op"], additionalProperties: false } },
};
const offsetProperty = { type: "integer", minimum: 0 };
const tool = (name: string, description: string, fields: object, required: string[] = []) => ({ type: "function", name, description, parameters: { type: "object", properties: fields, required, additionalProperties: false } });
export const STAFF_DATA_TOOLS = [
  tool("site_data_catalog", "Discover all site/client business data sources. Without dataset returns the source directory; with dataset returns its allowed fields, relationships and evidence cautions. Use before queries. Founder and Karen have the same broad read access.", { dataset: properties.dataset }),
  tool("query_site_records", "Read any catalogued source using AND filters, selected fields, exact count and pagination. Search a client with profiles/full_name/contains or email; if ambiguous ask which person. Follow profile_id, case_id and document_id to related records. contains treats input literally, not as SQL. Use countOnly for exact counts; do not call a page the whole result.", { ...properties, fields: { type: "array", items: { type: "string" }, maxItems: 60 }, orderBy: { type: "string" }, ascending: { type: "boolean" }, offset: offsetProperty, countOnly: { type: "boolean" } }, ["dataset"]),
  tool("read_site_field", "Read the full text/JSON of a chosen record field in chunks. Use for document readings, questionnaire payloads, notes, messages or knowledge; never infer unseen content. Pass nextOffset until null, and revision on subsequent chunks to detect changing data. Does not download or reprocess files.", { dataset: properties.dataset, recordId: { type: "string" }, field: { type: "string" }, offset: offsetProperty, revision: { type: "string" } }, ["dataset", "recordId", "field"]),
  tool("summarize_site_records", "Compute exact grouped counts or decimal sums over a filtered dataset (at most 5000 matches). A broader query returns needsNarrowerFilter, never a partial sum. Payment sums are always separated by currency. For total count use query_site_records countOnly. Values in health diaries are reported facts, never clinical conclusions.", { ...properties, groupBy: { type: "array", items: { type: "string" }, maxItems: 2 }, sumField: { type: "string", description: "Optional numeric field from the catalog. Omit for counts only." } }, ["dataset"]),
  tool("read_site_content", "Read the site's actual localized published copy: pages, prices, services, navigation, shop and legal texts. Without section returns section IDs; with section returns paginated text. This is bundled application content, not live deployment/uptime evidence. Dynamic method/book knowledge is in the knowledge dataset.", { section: { type: "string" }, offset: offsetProperty }),
];

function invalid(): never { throw new VoiceFailure("invalid", 400); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function keys(input: Record<string, unknown>, allowed: string[]) { if (Object.keys(input).some(k => !allowed.includes(k))) invalid(); }
function getDataset(name: unknown) {
  if (typeof name !== "string" || !Object.hasOwn(SITE_DATASETS, name)) return invalid();
  return SITE_DATASETS[name];
}
function column(value: unknown, schema: SiteDataset) {
  if (typeof value !== "string" || !schema.fields.includes(value)) return invalid();
  return value;
}
function scalar(value: unknown): value is string | number | boolean {
  return typeof value === "string" ? value.length <= 500 : typeof value === "number" ? Number.isFinite(value) : typeof value === "boolean";
}
type Filter = { field: string; op: string; value?: unknown };
function filters(value: unknown, schema: SiteDataset): Filter[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 12) return invalid();
  return value.map(raw => {
    const item = object(raw); keys(item, ["field", "op", "value"]);
    const field = column(item.field, schema);
    const op = item.op;
    if (typeof op !== "string" || !["eq", "neq", "gte", "gt", "lte", "lt", "contains", "in", "is_null", "not_null"].includes(op)) return invalid();
    if (op === "in") { if (!Array.isArray(item.value) || !item.value.length || item.value.length > 50 || !item.value.every(scalar)) invalid(); }
    else if (op === "contains") { if (typeof item.value !== "string" || !item.value.trim() || item.value.length > 200 || item.value.includes("*")) invalid(); }
    else if (op !== "is_null" && op !== "not_null" && !scalar(item.value)) invalid();
    return { field, op, value: item.value };
  });
}
function offset(value: unknown, max = 1_000_000) {
  if (value === undefined) return 0;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > max) return invalid();
  return value;
}
function database() { const db = createSupabaseServiceClient(); if (!db) throw new VoiceFailure("unavailable", 503); return db; }
type Query = ReturnType<ReturnType<ReturnType<typeof database>["from"]>["select"]>;
function applyFilters(query: Query, conditions: Filter[]) {
  for (const f of conditions) {
    if (f.op === "is_null") query = query.is(f.field, null);
    else if (f.op === "not_null") query = query.not(f.field, "is", null);
    else if (f.op === "contains") query = query.ilike(f.field, `%${String(f.value).replace(/[\\%_]/g, "\\$&")}%`);
    else if (f.op === "in") query = query.in(f.field, f.value as (string | number | boolean)[]);
    else query = query.filter(f.field, f.op, f.value);
  }
  return query;
}
function sourceError(error: unknown): never { if (error) throw new VoiceFailure("unavailable", 503); return invalid(); }
function textOf(value: unknown) { return typeof value === "string" ? value : JSON.stringify(value) ?? "null"; }
function chunk(value: unknown, start: number) {
  const text = textOf(value);
  if (start > text.length) invalid();
  return { text: text.slice(start, start + 10_000), offset: start, totalCharacters: text.length, nextOffset: start + 10_000 < text.length ? start + 10_000 : null, revision: createHash("sha256").update(text).digest("hex") };
}
async function audit(actor: VoiceActor, schema: SiteDataset, operation: string, recordIds: unknown[], conditions: Filter[] = []) {
  const result = await writeAuditLog({ actorId: actor.profileId, actorRole: actor.scope === "karen" ? "karen" : "admin", action: "assistant.site_data.read", entityTable: schema.table, metadata: { channel: "voice", persona: actor.scope, operation, record_ids: recordIds.slice(0, 20), filters: conditions.map(f => ({ field: f.field, op: f.op })) } });
  if (result.status !== "inserted") throw new VoiceFailure("unavailable", 503);
}

// Decimal aggregation avoids rounding cents or values through floating-point sums.
function decimal(value: unknown): { units: bigint; scale: number } {
  if (typeof value === "number" && Number.isInteger(value) && !Number.isSafeInteger(value)) throw new VoiceFailure("unavailable", 503);
  const match = String(value).match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match || (match[3]?.length ?? 0) > 20) throw new VoiceFailure("unavailable", 503);
  return { units: BigInt(`${match[1]}${match[2]}${match[3] ?? ""}`), scale: match[3]?.length ?? 0 };
}
function decimalString(units: bigint, scale: number) {
  const digits = (units < BigInt(0) ? -units : units).toString().padStart(scale + 1, "0");
  return `${units < BigInt(0) ? "-" : ""}${scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits}`;
}

export async function runStaffDataTool(actor: VoiceActor, name: string, raw: unknown, locale: Locale, now = new Date()) {
  if (actor.scope !== "founder" && actor.scope !== "karen") throw new VoiceFailure("forbidden", 403);
  const input = object(raw);
  const stamp = { asOf: now.toISOString(), untrustedContent: true, boundary: SITE_DATA_BOUNDARY };
  if (name === "site_data_catalog") {
    keys(input, ["dataset"]);
    return input.dataset === undefined ? { ...stamp, datasets: Object.entries(SITE_DATASETS).map(([id, d]) => ({ id, description: d.description })), siteContentTool: "read_site_content" }
      : { ...stamp, dataset: input.dataset, ...getDataset(input.dataset) };
  }
  if (name === "read_site_content") {
    keys(input, ["section", "offset"]);
    const sections: Record<string, unknown> = {
      ...getDictionary(locale), legal_offer: OFFER_CONTENT[locale], legal_privacy: PRIVACY_CONTENT[locale], legal_refund: REFUND_CONTENT[locale], shop_catalog: { sections: SHOP_SECTIONS, text: SHOP_CATALOG[locale] },
      service_prices: { currency: "USD", reviewTotal: REVIEW_TOTAL_USD, fiveWeeksTotal: PLAN_5W_TOTAL_USD, hundredDaysTotal: PLAN_100D_TOTAL_USD, plans: getPaymentPlans(locale).map(p => ({ product: p.product, title: p.title, description: p.description, priceLine: p.priceLine, paymentLinkConfigured: Boolean(p.paymentLinkUrl) })) },
      runtime_availability: { voiceEnabled: process.env.ANHAM_REALTIME_ENABLED === "true", voiceProviderKeyConfigured: Boolean(process.env.OPENAI_REALTIME_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()), voiceSigningSecretConfigured: (process.env.ANHAM_REALTIME_SESSION_SECRET?.trim().length ?? 0) >= 32, textOpenAIConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()), textClaudeConfigured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()), publicAssistantMode: ["off", "open", "guarded"].includes(process.env.PUBLIC_ASSISTANT_MODE ?? "") ? process.env.PUBLIC_ASSISTANT_MODE : "unspecified", evidence: "Configuration presence on this application server only, not provider health, billing balance or deployment telemetry." },
    };
    if (input.section === undefined) return { ...stamp, locale, source: "bundled site content", sections: Object.keys(sections) };
    if (typeof input.section !== "string" || !Object.hasOwn(sections, input.section)) return invalid();
    return { ...stamp, locale, source: "bundled site content", section: input.section, ...chunk(sections[input.section], offset(input.offset, 2_000_000)) };
  }
  const schema = getDataset(input.dataset);
  const origin = { ...stamp, dataset: input.dataset, source: schema.table, caution: schema.caution ?? null };
  if (name === "read_site_field") {
    keys(input, ["dataset", "recordId", "field", "offset", "revision"]);
    const field = column(input.field, schema); const start = offset(input.offset, 2_000_000);
    if (typeof input.recordId !== "string" || !input.recordId.length || input.recordId.length > 150 || (input.revision !== undefined && (typeof input.revision !== "string" || !/^[a-f0-9]{64}$/.test(input.revision)))) invalid();
    const { data, error } = await database().from(schema.table).select([...new Set([schema.key, field])].join(", ")).eq(schema.key, input.recordId).maybeSingle();
    if (error) sourceError(error); if (!data) throw new VoiceFailure("unavailable", 404);
    const record = data as unknown as Record<string, unknown>;
    const result = chunk(record[field], start);
    if (input.revision && input.revision !== result.revision) return { ...origin, changed: true, restartFromOffset: 0, instruction: "Record changed while reading. Restart; do not combine versions." };
    await audit(actor, schema, name, [record[schema.key]]);
    return { ...origin, recordId: record[schema.key], field, ...result };
  }
  const conditions = filters(input.filters, schema);
  if (name === "query_site_records") {
    keys(input, ["dataset", "filters", "fields", "orderBy", "ascending", "offset", "countOnly"]);
    const start = offset(input.offset);
    if (input.fields !== undefined && (!Array.isArray(input.fields) || !input.fields.length || input.fields.length > 60)) invalid();
    const fields = [...new Set([schema.key, ...(Array.isArray(input.fields) ? input.fields.map(f => column(f, schema)) : schema.fields)])];
    const order = input.orderBy === undefined ? schema.order : column(input.orderBy, schema);
    if (input.ascending !== undefined && typeof input.ascending !== "boolean") invalid();
    if (input.countOnly !== undefined && typeof input.countOnly !== "boolean") invalid();
    let query = applyFilters(database().from(schema.table).select(input.countOnly ? schema.key : fields.join(", "), { count: "exact", head: input.countOnly === true }), conditions);
    if (!input.countOnly) query = query.order(order, { ascending: input.ascending === true }).order(schema.key, { ascending: input.ascending === true }).range(start, start + 9);
    const { data, error, count } = await query;
    if (error || count == null) throw new VoiceFailure("unavailable", 503);
    const all = (data ?? []) as unknown as Record<string, unknown>[];
    if (!input.countOnly && start < count && !all.length) throw new VoiceFailure("unavailable", 503);
    const rows: Record<string, unknown>[] = []; let size = 0;
    for (const record of all) {
      const row = Object.fromEntries(fields.map(field => {
        const value = record[field]; const text = textOf(value);
        return [field, text.length > 1500 ? { preview: text.slice(0, 1500), totalCharacters: text.length, truncated: true, readWith: "read_site_field" } : value];
      }));
      const length = JSON.stringify(row).length;
      if (rows.length && size + length > 30000) break;
      rows.push(row); size += length;
    }
    await audit(actor, schema, name, rows.map(r => r[schema.key]), conditions);
    return { ...origin, totalMatches: count, countExact: true, offset: start, nextOffset: !input.countOnly && start + rows.length < count ? start + rows.length : null, rows, coverage: "This is a bounded page, not the entire dataset. Field previews explicitly mark omitted text. Separate requests are fresh reads; records may change between pages." };
  }
  if (name === "summarize_site_records") {
    keys(input, ["dataset", "filters", "groupBy", "sumField"]);
    if (input.groupBy !== undefined && (!Array.isArray(input.groupBy) || input.groupBy.length > 2)) invalid();
    const groupBy = [...new Set((input.groupBy as unknown[] | undefined ?? []).map(f => column(f, schema)))];
    const sumField = input.sumField === undefined ? null : column(input.sumField, schema);
    if (sumField && !schema.numeric.includes(sumField)) invalid();
    if (schema.table === "payments" && sumField && !groupBy.includes("currency")) groupBy.push("currency");
    const columns = [...new Set([schema.key, ...groupBy, ...(sumField ? [sumField] : [])])];
    const query = () => applyFilters(database().from(schema.table).select(columns.join(", "), { count: "exact" }), conditions).order(schema.key);
    const rows: Record<string, unknown>[] = []; let total = 0;
    for (let start = 0; start < 5000; start += 1000) {
      const page = await query().range(start, start + 999);
      if (page.error || page.count == null) throw new VoiceFailure("unavailable", 503);
      if (start && page.count !== total) return { ...origin, changed: true, instruction: "Matching rows changed during aggregation; retry. No partial aggregate is returned." };
      total = page.count;
      if (total > 5000) { await audit(actor, schema, name, [], conditions); return { ...origin, totalMatches: total, needsNarrowerFilter: true, aggregate: null }; }
      rows.push(...(page.data ?? []) as unknown as Record<string, unknown>[]);
      if (rows.length >= total) break;
      if (!page.data?.length) throw new VoiceFailure("unavailable", 503);
    }
    if (rows.length !== total || new Set(rows.map(r => r[schema.key])).size !== rows.length) throw new VoiceFailure("unavailable", 503);
    const groups = new Map<string, { values: unknown[]; count: number; nonNullValues: number; units: bigint; scale: number }>();
    for (const row of rows) {
      const values = groupBy.map(k => row[k]);
      if (values.some(v => typeof v === "object" && v !== null || textOf(v).length > 200)) invalid();
      const key = JSON.stringify(values); const group = groups.get(key) ?? { values, count: 0, nonNullValues: 0, units: BigInt(0), scale: 0 };
      group.count++;
      if (sumField && row[sumField] != null) {
        const value = decimal(row[sumField]); const scale = Math.max(group.scale, value.scale);
        group.units = group.units * BigInt(10) ** BigInt(scale - group.scale) + value.units * BigInt(10) ** BigInt(scale - value.scale); group.scale = scale; group.nonNullValues++;
      }
      groups.set(key, group);
      if (groups.size > 100) { await audit(actor, schema, name, [], conditions); return { ...origin, totalMatches: total, needsNarrowerFilter: true, aggregate: null }; }
    }
    await audit(actor, schema, name, [], conditions);
    return { ...origin, totalMatches: total, complete: true, groupBy, sumField, groups: [...groups.values()].map(g => ({ values: g.values, count: g.count, ...(sumField ? { sum: g.nonNullValues ? decimalString(g.units, g.scale) : null, nonNullValues: g.nonNullValues } : {}) })), coverage: "Computed from every matching row read, never from a sample. Separate database pages are not a transactional snapshot." };
  }
  return invalid();
}
