import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOwnCaseLifecycleEvents } from "@/lib/cases/queries";
import { getStaffCaseDetail } from "@/lib/cases/staff-queries";
import { writeLifecycleEvent, writeLifecycleEvents } from "@/lib/cases/lifecycle";

const state = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  from: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ from: state.from })
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ from: state.from })
}));

beforeEach(() => {
  state.select.mockReset();
  state.insert.mockReset();
  state.from.mockReset();
  const query = {
    eq: () => query,
    order: () => query,
    limit: async () => ({ data: [], error: null }),
    maybeSingle: async () => ({ data: null, error: null })
  };
  state.select.mockReturnValue(query);
  state.insert.mockResolvedValue({ error: null });
  state.from.mockReturnValue({ select: state.select, insert: state.insert });
});

describe("retired lifecycle columns are optional across database environments", () => {
  it("reads only columns shared by staging and production", async () => {
    expect((await getOwnCaseLifecycleEvents("profile", "case")).status).toBe("ready");
    expect((await getStaffCaseDetail("case")).status).toBe("ready");
    expect(state.select).toHaveBeenCalledTimes(2);
    for (const [selection] of state.select.mock.calls) {
      expect(selection).not.toContain("from_status");
      expect(selection).not.toContain("to_status");
    }
  });

  it("writes payment and period history without retired classifications", async () => {
    const common = { profileId: "profile", caseId: "case" };
    expect(await writeLifecycleEvent({ ...common, eventType: "payment_recorded" }))
      .toEqual({ status: "inserted" });
    expect(await writeLifecycleEvents([{ ...common, eventType: "service_period_started" }]))
      .toEqual({ status: "inserted" });
    for (const [record] of state.insert.mock.calls) {
      for (const row of Array.isArray(record) ? record : [record]) {
        expect(row).not.toHaveProperty("from_status");
        expect(row).not.toHaveProperty("to_status");
      }
    }
  });
});
