import { describe, expect, it, vi } from "vitest";
import { ensureCaseForPaidProfile } from "@/lib/cases/ensure-paid-case";

const profileId = "fc95c347-3555-44dc-a987-b939e3628456";

function fakeDb(lookups: Array<{ data: { id: string } | null; error: { message: string } | null }>,
  insertResult: { data: { id: string } | null; error: { code?: string; message: string } | null }) {
  const maybeSingle = vi.fn(async () => lookups.shift());
  const single = vi.fn(async () => insertResult);
  const select = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })), single }));
  const insert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ select, insert }));
  return { db: { from } as unknown as Parameters<typeof ensureCaseForPaidProfile>[0], from, insert };
}

describe("paid Case shell", () => {
  it("reuses an existing Case without inserting a second one", async () => {
    const { db, insert } = fakeDb([{ data: { id: "existing" }, error: null }], { data: null, error: null });
    expect(await ensureCaseForPaidProfile(db, profileId)).toBe("existing");
    expect(insert).not.toHaveBeenCalled();
  });

  it("creates an empty Case only for the verified payment owner", async () => {
    const { db, insert } = fakeDb([{ data: null, error: null }], { data: { id: "created" }, error: null });
    expect(await ensureCaseForPaidProfile(db, profileId)).toBe("created");
    expect(insert).toHaveBeenCalledWith({ profile_id: profileId });
  });

  it("reuses a concurrent winner after a unique-profile conflict", async () => {
    const { db } = fakeDb([
      { data: null, error: null }, { data: { id: "winner" }, error: null }
    ], { data: null, error: { code: "23505", message: "unique profile" } });
    expect(await ensureCaseForPaidProfile(db, profileId)).toBe("winner");
  });

  it("fails closed on a database lookup error", async () => {
    const { db, insert } = fakeDb([{ data: null, error: { message: "unavailable" } }], { data: null, error: null });
    await expect(ensureCaseForPaidProfile(db, profileId)).rejects.toThrow("paid case lookup failed");
    expect(insert).not.toHaveBeenCalled();
  });
});
