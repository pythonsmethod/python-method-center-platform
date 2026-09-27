import { describe, expect, it, vi } from "vitest";
import { ensureDeliveryTaskForPayment } from "@/lib/delivery/create-task";

const profile = {
  delivery_first_name: "Sandbox", delivery_last_name: "Test",
  delivery_email: "synthetic@example.test", delivery_phone: "+15555550123",
  delivery_country_code: "US", delivery_region: "California",
  delivery_city: "Test City", delivery_street: "Sandbox Street",
  delivery_building: "0", delivery_unit: null, delivery_postal_code: "94105",
  delivery_instructions: "STAGING TEST ONLY", delivery_confirmed_at: "2026-09-24T00:00:00Z"
};

function client(existing: { id: string; client_profile_id: string; case_id: string | null }) {
  const update = vi.fn(() => ({
    eq: () => ({ eq: () => ({ is: async () => ({ error: null }) }) })
  }));
  const db = { from: (table: string) => {
    if (table === "profiles") return { select: () => ({ eq: () => ({
      maybeSingle: async () => ({ data: profile })
    }) }) };
    if (table === "volunteer_assignments") return { select: () => ({ eq: () => ({ eq: () => ({
      maybeSingle: async () => ({ data: { profile_id: "volunteer-1" } })
    }) }) }) };
    if (table === "delivery_tasks") return {
      upsert: () => ({ select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existing, error: null }) }) }),
      update
    };
    throw new Error(`unexpected table ${table}`);
  } };
  return { db: db as unknown as Parameters<typeof ensureDeliveryTaskForPayment>[0], update };
}

describe("delivery task recovery after paid Case creation", () => {
  it("links a previously created gift task to the paid Case without inserting a duplicate", async () => {
    const { db, update } = client({ id: "task-1", client_profile_id: "profile-1", case_id: null });
    const result = await ensureDeliveryTaskForPayment(db, {
      paymentId: "payment-1", profileId: "profile-1", caseId: "case-1",
      product: "personal_support", months: 6
    });
    expect(result).toEqual({ status: "ready", id: "task-1" });
    expect(update).toHaveBeenCalledWith({ case_id: "case-1" });
  });

  it("refuses to attach another client's gift task", async () => {
    const { db, update } = client({ id: "task-1", client_profile_id: "someone-else", case_id: null });
    const result = await ensureDeliveryTaskForPayment(db, {
      paymentId: "payment-1", profileId: "profile-1", caseId: "case-1",
      product: "personal_support", months: 1
    });
    expect(result).toEqual({ status: "error", message: "delivery task ownership mismatch" });
    expect(update).not.toHaveBeenCalled();
  });
});
