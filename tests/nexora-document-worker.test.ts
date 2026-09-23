import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ service: null as SupabaseClient | null, read: vi.fn(), load: vi.fn(), legacy: vi.fn(), questionnaire: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => mock.service }));
vi.mock("@/lib/assistant/claude", () => ({ askClaude: mock.read, hasClaudeEnv: () => true, ASSISTANT_MODEL: "synthetic-reader" }));
vi.mock("@/lib/assistant/router", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/assistant/router")>(), askAssistantWithAttachments: mock.legacy }));
vi.mock("@/lib/cases/case-documents", () => ({ loadCaseDocuments: mock.load, readMimeType: () => "text/plain" }));
vi.mock("@/lib/health/queries", () => ({ getLatestQuestionnaireFor: mock.questionnaire }));
import { processNextCaseDocument, processNextProfileDocument } from "@/lib/documents/processing";
import { conversationArchiveScope, withConversationArchive } from "@/lib/assistant/conversation-archive";
import type { ConversationScope } from "@/lib/assistant/conversation-context";

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;
const sourceText = "synthetic.txt :: [КОНТРОЛЬ ИСТОЧНИКА] :: [ПОКРЫТИЕ ДОКУМЕНТА] :: COMPLETE :: - :: ДА :: -\nsynthetic.txt :: LAB :: Hemoglobin :: 12.3 g/dL :: 12-15.5 :: FILLED :: ДА :: -";

/** Real supabase-js query construction against a deterministic local transport. */
function database() {
  const tables: Tables = {
    document_processing_jobs: [
      { id: "job-b", document_id: "doc-b", case_id: "case-b", profile_id: "account-b", status: "queued", attempts: 0, available_at: "2026-01-01", created_at: "2026-01-01" },
      { id: "job-a", document_id: "doc-a", case_id: "case-a", profile_id: "account-a", status: "queued", attempts: 0, available_at: "2026-01-01", created_at: "2026-01-02" }
    ],
    uploaded_documents: ["a", "b"].map(letter => ({ id: `doc-${letter}`, case_id: `case-${letter}`, profile_id: `account-${letter}`, storage_path: `account-${letter}/synthetic.txt`, original_filename: "synthetic.txt", metadata: { mime_type: "text/plain", keep: true }, created_at: "2026-01-01", archived_at: null, identity_review_status: null, document_status: "queued", profiles: { locale: "en" } })),
    client_cases: ["a", "b"].map(letter => ({ id: `case-${letter}`, profile_id: `account-${letter}`, care_recipients: null })),
    profiles: ["a", "b"].map(letter => ({ id: `account-${letter}`, full_name: "Synthetic Patient", locale: "en" })),
    document_extractions: [], analysis_runs: [], lab_values: [], case_messages: []
  };
  const requests: Array<{ table: string; method: string; query: URLSearchParams; body: Row | Row[] | null }> = [];
  const control = { failReceipt: false, loseClaim: false, failSourceLookup: false, failReadyTable: "", failReplacement: false };
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const table = url.pathname.split("/").at(-1)!;
    const method = init?.method ?? "GET", body = init?.body ? JSON.parse(String(init.body)) as Row | Row[] : null;
    requests.push({ table, method, query: url.searchParams, body });
    if (url.pathname.includes("/rpc/")) throw new Error("Global claim is forbidden in an account/Case request");
    const rows = tables[table];
    if (!rows) throw new Error(`Unexpected fixture table: ${table}`);
    const headers = new Headers(init?.headers);
    if (control.failSourceLookup && table === "uploaded_documents" && method === "GET") return Response.json({ message: "synthetic lookup failure" }, { status: 500 });
    if (control.failReadyTable === table && method === "PATCH" && body && (("status" in body && body.status === "ready") || ("document_status" in body && body.document_status === "ready"))) return Response.json({ message: "synthetic completion failure" }, { status: 500 });
    if (control.failReplacement && table === "lab_values" && method === "DELETE") return Response.json({ message: "synthetic replacement failure" }, { status: 500 });
    const selected = rows.filter(row => [...url.searchParams].every(([key, value]) => {
      if (["select", "order", "limit", "on_conflict"].includes(key)) return true;
      const split = value.indexOf("."), op = value.slice(0, split), expected = value.slice(split + 1);
      if (op === "eq") return String(row[key]) === expected;
      if (op === "neq") return String(row[key]) !== expected;
      if (op === "is") return expected === "null" ? row[key] == null : String(row[key]) === expected;
      if (op === "lte") return String(row[key]) <= expected;
      throw new Error(`Unsupported fixture filter: ${op}`);
    })).sort((a,b) => String(a.created_at).localeCompare(String(b.created_at)));
    let output: Row[] = selected;
    if (method === "GET") output = selected.slice(0, Number(url.searchParams.get("limit") ?? selected.length));
    if (method === "PATCH") {
      if (control.failReceipt && table === "uploaded_documents" && body && "metadata" in body) return Response.json({ message: "synthetic receipt write failure" }, { status: 500 });
      if (control.loseClaim && table === "document_processing_jobs" && body && "status" in body && body.status === "processing") output = [];
      else for (const row of selected) Object.assign(row, structuredClone(body));
    }
    if (method === "DELETE") { tables[table] = rows.filter(row => !selected.includes(row)); output = []; }
    if (method === "POST") {
      output = (Array.isArray(body) ? body : [body!]).map(value => {
        const conflict = url.searchParams.get("on_conflict");
        const existing = conflict ? rows.find(row => row[conflict] === value[conflict]) : undefined;
        if (existing) { Object.assign(existing, structuredClone(value)); return existing; }
        const added = { id: `stored-${table}-${rows.length}`, ...structuredClone(value) }; rows.push(added); return added;
      });
    }
    const payload = headers.get("Accept")?.includes("vnd.pgrst.object") ? output[0] ?? null : output;
    return Response.json(payload);
  };
  mock.service = createClient("https://synthetic.supabase.test", "fixture-key", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher } });
  return { tables, requests, control };
}

beforeEach(() => {
  vi.clearAllMocks(); vi.unstubAllEnvs(); mock.questionnaire.mockResolvedValue(null);
  mock.load.mockImplementation(async (rows: Array<{ id: string; created_at: string }>) => ({ attachments: [{ name: "synthetic.txt", mediaType: "text/plain", data: Buffer.from("NO PHI synthetic source").toString("base64") }], skipped: [], fingerprint: `${rows[0].id}:${rows[0].created_at}` }));
  mock.read.mockImplementation(async (_system: string, messages: Array<{ content: string }>) => ({ status: "ok", reply: messages[0].content.includes("шапку") ? "ФИО: Synthetic Patient" : sourceText }));
  mock.legacy.mockImplementation(mock.read);
});

describe("PMC worker through NEXORA with synthetic persistence", () => {
  it("claims its own job despite an older foreign job, stores readings and receipts, and does not run it twice", async () => {
    const { tables, requests } = database();
    expect(await processNextProfileDocument("account-a")).toEqual({ status: "ready", documentId: "doc-a" });
    expect(tables.document_processing_jobs[0].status).toBe("queued");
    expect(mock.load.mock.calls[0][0][0].id).toBe("doc-a");
    expect(mock.read).toHaveBeenCalledTimes(3); expect(mock.legacy).not.toHaveBeenCalled();
    expect(tables.document_extractions).toHaveLength(1);
    expect(tables.document_extractions[0]).toMatchObject({ document_id: "doc-a", source_fingerprint: "doc-a:2026-01-01" });
    const metadata = tables.uploaded_documents[0].metadata as Row;
    const receipts = (metadata.nexora_document_read as { receipts: Row[] }).receipts;
    expect(receipts).toHaveLength(3); expect(receipts.every(r => r.verification === "NOT_VERIFIED")).toBe(true);
    expect(metadata.keep).toBe(true); expect(JSON.stringify(receipts)).not.toContain("12.3");
    expect(tables.analysis_runs[0].extraction_model_version).toContain("nexora-document-read-v1");
    expect(await processNextProfileDocument("account-a")).toEqual({ status: "idle" });
    expect(mock.read).toHaveBeenCalledTimes(3);
    expect(requests.find(r => r.table === "document_processing_jobs" && r.method === "GET")?.query.get("profile_id")).toBe("eq.account-a");
  });
  it("retains the Case-scoped path and skips a lost concurrent claim", async () => {
    const db = database(); db.control.loseClaim = true;
    expect(await processNextCaseDocument("case-a")).toEqual({ status: "idle" });
    expect(mock.read).not.toHaveBeenCalled(); expect(mock.load).not.toHaveBeenCalled();
    db.control.loseClaim = false;
    expect(await processNextCaseDocument("case-a")).toEqual({ status: "ready", documentId: "doc-a" });
    expect(db.tables.document_processing_jobs[0].status).toBe("queued");
  });
  it.each(["wrong-owner", "wrong-case", "archived"])("stops %s source before storage download or provider access", async fault => {
    const { tables } = database();
    if (fault === "wrong-owner") tables.uploaded_documents[0].profile_id = "account-b";
    if (fault === "wrong-case") tables.uploaded_documents[0].case_id = "case-b";
    if (fault === "archived") tables.uploaded_documents[0].archived_at = "2026-01-03";
    const original = structuredClone(tables.uploaded_documents[0]);
    expect((await processNextProfileDocument("account-a")).status).toBe("failed");
    expect(mock.read).not.toHaveBeenCalled(); expect(mock.load).not.toHaveBeenCalled();
    expect(tables.uploaded_documents[0]).toEqual(original); expect(tables.case_messages).toHaveLength(0);
  });
  it("uses the represented patient, not the account owner's identity or health questionnaire", async () => {
    const { tables } = database();
    tables.profiles[0].full_name = "Different Account Owner";
    tables.client_cases[0].care_recipients = { full_name: "Synthetic Patient", birth_date: "2000-01-01", is_current: true };
    expect((await processNextProfileDocument("account-a")).status).toBe("ready");
    expect(mock.read).toHaveBeenCalledTimes(3);
    expect(mock.questionnaire).not.toHaveBeenCalled();
  });
  it("does not touch an unverified source or notify anyone when its lookup fails", async () => {
    const db = database(); db.control.failSourceLookup = true;
    const sources = structuredClone(db.tables.uploaded_documents);
    expect((await processNextProfileDocument("account-a")).status).toBe("retrying");
    expect(db.tables.uploaded_documents).toEqual(sources); expect(db.tables.case_messages).toHaveLength(0);
    expect(mock.read).not.toHaveBeenCalled(); expect(mock.load).not.toHaveBeenCalled();
  });
  it.each(["uploaded_documents", "document_processing_jobs"])("does not report ready when %s completion cannot be stored", async table => {
    const db = database(); db.control.failReadyTable = table;
    expect((await processNextProfileDocument("account-a")).status).toBe("retrying");
    expect(db.tables.document_processing_jobs[1].status).toBe("queued");
  });
  it("does not append duplicate values after a failed replacement", async () => {
    const db = database(); db.control.failReplacement = true;
    expect((await processNextProfileDocument("account-a")).status).toBe("retrying");
    expect(db.tables.lab_values).toHaveLength(0);
  });
  it.each(["refusal", "incomplete"])("keeps a provider %s out of evidence and leaves a retryable job", async fault => {
    const { tables } = database();
    mock.read.mockResolvedValue(fault === "refusal" ? { status: "ok", reply: "refused", refusal: "provider_policy" } : { status: "error", code: "INCOMPLETE_RESPONSE", message: "incomplete" });
    expect((await processNextProfileDocument("account-a")).status).toBe("retrying");
    expect(tables.document_extractions).toHaveLength(0); expect(tables.analysis_runs).toHaveLength(0);
    expect(mock.read).toHaveBeenCalledOnce();
  });
  it("does not report ready when receipt persistence failed", async () => {
    const db = database(); db.control.failReceipt = true;
    expect((await processNextProfileDocument("account-a")).status).toBe("retrying");
    expect(db.tables.analysis_runs).toHaveLength(0);
    expect(db.tables.uploaded_documents[0].document_status).toBe("queued");
  });
  it("has an explicit rollback that still uses scoped claims and preserves the existing evidence store", async () => {
    vi.stubEnv("NEXORA_DOCUMENT_READ_MODE", "legacy"); const { tables } = database();
    expect((await processNextProfileDocument("account-a")).status).toBe("ready");
    expect(mock.legacy).toHaveBeenCalledTimes(3);
    expect(tables.document_extractions).toHaveLength(1); expect(tables.document_processing_jobs[0].status).toBe("queued");
  });
  it("does not inherit another conversation's archive or tools", async () => {
    database(); const seen: unknown[] = [];
    mock.read.mockImplementation(async (_system: string, messages: Array<{ content: string }>) => {
      seen.push(conversationArchiveScope());
      return { status: "ok", reply: messages[0].content.includes("шапку") ? "ФИО: Synthetic Patient" : sourceText };
    });
    await withConversationArchive({ private: true, profileId: "unrelated" } as unknown as ConversationScope, () => processNextProfileDocument("account-a"));
    expect(seen).toEqual([undefined, undefined, undefined]);
  });
});
