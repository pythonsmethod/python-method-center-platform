import { describe, expect, it } from "vitest";
import { syncCaseFromOnboarding } from "@/lib/onboarding/case-sync";

// A fake service client that records the call and answers with a chosen
// count — the exact contract the fix depends on.
function fakeService(result: {
  error: { message: string } | null;
  count: number | null;
}) {
  const calls: {
    values?: { title: string; summary: string };
    filters: [string, string][];
  } = { filters: [] };

  const client = {
    from: () => ({
      update: (
        values: { title: string; summary: string },
        options: { count: "exact" }
      ) => {
        calls.values = values;
        expect(options.count).toBe("exact");
        return {
          eq: (column: string, value: string) => {
            calls.filters.push([column, value]);
            return {
              eq: (column2: string, value2: string) => {
                calls.filters.push([column2, value2]);
                return Promise.resolve(result);
              }
            };
          }
        };
      }
    })
  };

  return { client, calls };
}

const input = {
  caseId: "case-1",
  profileId: "profile-1",
  primaryGoal: "Новая цель после исправления",
  situationDescription: "Обновлённое описание ситуации"
};

describe("onboarding resubmission syncs the case (P1-01)", () => {
  it("writes the corrected answers into the staff-facing case", async () => {
    const { client, calls } = fakeService({ error: null, count: 1 });

    const result = await syncCaseFromOnboarding(client, input);

    expect(result.status).toBe("ok");
    // The second submission's text is what reaches client_cases.
    expect(calls.values).toEqual({
      title: "Новая цель после исправления",
      summary: "Обновлённое описание ситуации"
    });
    // Scoped to this case AND this owner — never a blanket update.
    expect(calls.filters).toEqual([
      ["id", "case-1"],
      ["profile_id", "profile-1"]
    ]);
  });

  it("fails loudly when zero rows were updated", async () => {
    // The silent-RLS shape: no error, no rows. Before the fix this passed
    // as success while the client's edits were lost.
    const { client } = fakeService({ error: null, count: 0 });

    const result = await syncCaseFromOnboarding(client, input);

    expect(result.status).toBe("error");
  });

  it("surfaces database errors", async () => {
    const { client } = fakeService({
      error: { message: "connection lost" },
      count: null
    });

    const result = await syncCaseFromOnboarding(client, input);

    expect(result.status).toBe("error");
  });

  it("fails when the service client is not configured", async () => {
    const result = await syncCaseFromOnboarding(null, input);

    expect(result.status).toBe("error");
  });
});
