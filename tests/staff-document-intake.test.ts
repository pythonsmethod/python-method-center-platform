import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStaffDocumentIntakeItems } from "@/lib/documents/staff-queries";

const db = vi.hoisted(() => ({ create: vi.fn(), from: vi.fn(), select: vi.fn(), order: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: db.create }));

beforeEach(() => {
  vi.clearAllMocks();
  db.create.mockReturnValue({ from: db.from });
  db.from.mockReturnValue({ select: db.select });
  db.select.mockReturnValue({ order: db.order });
  db.order.mockReturnValue({ limit: db.limit });
});

describe("staff document intake", () => {
  it("loads the owner profile when documents also reference an identity reviewer", async () => {
    const owner = { email: "owner@example.test", full_name: "Document owner" };
    db.select.mockImplementation((selection: string) => {
      const ownerJoin = selection.includes("profiles!uploaded_documents_profile_id_fkey(email, full_name)");
      db.limit.mockResolvedValue(ownerJoin
        ? { data: [{ id: "document-1", profile_id: "owner-1", case_id: "case-1", profiles: owner, client_cases: { title: "Case" } }], error: null }
        : { data: null, error: { message: "More than one relationship found" } });
      return { order: db.order };
    });

    const result = await getStaffDocumentIntakeItems();
    expect(result.status).toBe("ready");
    if (result.status === "ready") expect(result.documents[0].profiles).toEqual(owner);
    expect(db.from).toHaveBeenCalledWith("uploaded_documents");
    expect(db.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(db.limit).toHaveBeenCalledWith(100);
  });

  it("keeps database failure distinct from an empty document list", async () => {
    db.limit.mockResolvedValue({ data: null, error: { message: "Query failed" } });
    expect(await getStaffDocumentIntakeItems()).toEqual({ status: "error", message: "Query failed" });
  });

  it("reports unavailable server configuration without making a query", async () => {
    db.create.mockReturnValue(null);
    expect((await getStaffDocumentIntakeItems()).status).toBe("missing-service-role");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("returns an empty list only after a successful query", async () => {
    db.limit.mockResolvedValue({ data: [], error: null });
    expect(await getStaffDocumentIntakeItems()).toEqual({ status: "ready", documents: [] });
  });
});
