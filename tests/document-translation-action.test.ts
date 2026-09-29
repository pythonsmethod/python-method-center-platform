import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ staff: vi.fn(), user: vi.fn(), pilot: vi.fn(), picture: vi.fn(), ask: vi.fn() }));
vi.mock("@/lib/auth/require-staff", () => ({ getStaffUserState: mock.staff }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getUser: mock.user } }) }));
vi.mock("@/lib/documents/pilot", () => ({ getDocumentChainPilotStatus: mock.pilot }));
vi.mock("@/lib/analytical-picture/queries", () => ({ getCaseAnalyticalPicture: mock.picture }));
vi.mock("@/lib/assistant/router", () => ({ askAssistantWithAttachments: mock.ask }));

import { translateDocumentRows } from "@/lib/documents/translation-action";
import { translationBatches } from "@/lib/documents/translation";
import type { ExtractedClinicalEvidence } from "@/lib/analytical-picture/case-picture";

const caseId = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";
const row: ExtractedClinicalEvidence = { id: "extraction-agreed-0", documentId, section: "Labor", label: "Glukose", value: "5,4 mmol/L", alternateValue: null,
  category: "UNKNOWN", trustState: "SOURCE_ONLY", disputeReason: null, priority: "SUPPORTING", reviewDecision: "PENDING", correction: null,
  reviewToken: "source-token", provenance: { level: "PAGE", page: 1, sourceHash: "a".repeat(64), excerpt: "Glukose 5,4 mmol/L" } };

function form(): FormData {
  const batch = translationBatches([row])[0];
  const data = new FormData();
  Object.entries({ case_id: caseId, document_id: documentId, page: "1", batch_index: "0", batch_token: batch.token, locale: "ru" })
    .forEach(([key, value]) => data.set(key, value));
  return data;
}

const translate = (data = form()) => translateDocumentRows({ status: "idle", message: "", rows: [] }, data);

beforeEach(() => {
  vi.clearAllMocks();
  mock.staff.mockResolvedValue({ status: "authorized", userId: "staff" });
  mock.user.mockResolvedValue({ data: { user: { id: "staff" } }, error: null });
  mock.pilot.mockResolvedValue("enabled");
  mock.picture.mockResolvedValue({ status: "ready", picture: { documents: [{ id: documentId, status: "ready" }], extractedEvidence: [row] } });
  mock.ask.mockResolvedValue({ status: "ok", reply: JSON.stringify({ translations: [{ id: row.id, sourceLanguage: "de", sectionRu: "Лаборатория", labelRu: "Глюкоза", valueRu: row.value, alternateValueRu: null }] }) });
});

describe("pilot-scoped translation action", () => {
  it("refuses an unauthorized session before sending any source to the model", async () => {
    mock.user.mockResolvedValue({ data: { user: { id: "different" } }, error: null });
    expect((await translate()).status).toBe("error");
    expect(mock.ask).not.toHaveBeenCalled();
  });
  it("refuses Cases outside the allowlist and nonready documents", async () => {
    mock.pilot.mockResolvedValueOnce("legacy");
    expect((await translate()).status).toBe("error");
    mock.picture.mockResolvedValueOnce({ status: "ready", picture: { documents: [{ id: documentId, status: "queued" }], extractedEvidence: [row] } });
    expect((await translate()).status).toBe("error");
    expect(mock.ask).not.toHaveBeenCalled();
  });
  it("refuses stale evidence and a foreign document even if a client edits the form", async () => {
    const stale = form(); stale.set("batch_token", "b".repeat(64));
    expect((await translate(stale)).status).toBe("error");
    const foreign = form(); foreign.set("document_id", "33333333-3333-4333-8333-333333333333");
    expect((await translate(foreign)).status).toBe("error");
    expect(mock.ask).not.toHaveBeenCalled();
  });
  it("sends only saved literal text and accepts a source-paired display translation", async () => {
    const result = await translate();
    expect(result.status).toBe("success");
    expect(result.rows).toEqual([{ id: row.id, sourceLanguage: "de", sectionRu: "Лаборатория", labelRu: "Глюкоза", valueRu: row.value, alternateValueRu: null }]);
    expect(mock.ask).toHaveBeenCalledOnce();
    expect(mock.ask.mock.calls[0][1][0].content).toContain("Glukose");
    expect(mock.ask.mock.calls[0][3]).toEqual([]);
  });
});
