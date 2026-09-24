import { describe, expect, it } from "vitest";
import { parseUnifiedNote, unifiedKnowledgeRecord, UNIFIED_NOTE_MAX } from "@/lib/assistant/unified-knowledge";
const requestId = "11111111-1111-4111-a111-111111111111";
const caseId = "22222222-2222-4222-a222-222222222222";
const raw = { text: "Synthetic material", confirmed: true, requestId, caseId, locale: "en" };
describe("one unified Anham knowledge system", () => {
  it("requires explicit confirmation", () => { expect(parseUnifiedNote({ ...raw, confirmed: false })).toBeNull(); });
  it("rejects role, audience and collection supplied by a caller", () => { expect(parseUnifiedNote({ ...raw, audience: "client" })).toBeNull(); expect(parseUnifiedNote({ ...raw, collection: "method" })).toBeNull(); });
  it("does not truncate long knowledge silently", () => { expect(parseUnifiedNote({ ...raw, text: "a".repeat(UNIFIED_NOTE_MAX + 1) })).toBeNull(); });
  it("records provenance and stays staff-only in the existing general collection", () => { const record = unifiedKnowledgeRecord("synthetic-karen", parseUnifiedNote(raw)!); expect(record.audience).toBe("staff"); expect(record.collection).toBe("general"); expect(record.content).toContain(caseId); expect(record.content).toContain('"clinical_verification":"not_implied"'); expect(record.content).toContain("Synthetic material"); });
  it("stays inside the existing 8000-character database constraint", () => { const input = parseUnifiedNote({ ...raw, text: "a".repeat(UNIFIED_NOTE_MAX) })!; expect(unifiedKnowledgeRecord("33333333-3333-4333-a333-333333333333", input).content.length).toBeLessThanOrEqual(8000); });
  it("has actor-scoped stable IDs for safe retry without overwrite", () => { const input = parseUnifiedNote(raw)!; const first = unifiedKnowledgeRecord("owner-a", input); expect(unifiedKnowledgeRecord("owner-a", input).id).toBe(first.id); expect(unifiedKnowledgeRecord("owner-b", input).id).not.toBe(first.id); });
  it("rejects malformed Case identifiers", () => { expect(parseUnifiedNote({ ...raw, caseId: "not-a-case-id" })).toBeNull(); });
});
