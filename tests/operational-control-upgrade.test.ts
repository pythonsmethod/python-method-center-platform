import { describe, expect, it } from "vitest";

type State = { profiles: Set<string>; assignments: Set<string>; openOperationalActions: Set<string> };

function applyUpgrade(state: State, eligibleCaseIds: string[]) {
  let profilesAdded = 0;
  let assignmentsAdded = 0;
  let actionsAdded = 0;
  for (const caseId of eligibleCaseIds) {
    if (!state.profiles.has(caseId)) { state.profiles.add(caseId); profilesAdded += 1; }
    if (!state.assignments.has(caseId)) { state.assignments.add(caseId); assignmentsAdded += 1; }
    if (!state.openOperationalActions.has(caseId)) { state.openOperationalActions.add(caseId); actionsAdded += 1; }
  }
  return { profilesAdded, assignmentsAdded, actionsAdded, idempotentRepeat: profilesAdded + assignmentsAdded + actionsAdded === 0 };
}

describe("operational control v1 to v2 upgrade", () => {
  it("recognizes the old semantic action and reports a zero-change repeat", () => {
    const state: State = {
      profiles: new Set(["case-1"]),
      assignments: new Set(["case-1"]),
      openOperationalActions: new Set(["case-1"])
    };
    expect(applyUpgrade(state, ["case-1"])).toEqual({ profilesAdded: 0, assignmentsAdded: 0, actionsAdded: 0, idempotentRepeat: true });
    expect(state.openOperationalActions.size).toBe(1);
  });

  it("derives replay counts from actual empty or nonstandard state", () => {
    const empty: State = { profiles: new Set(), assignments: new Set(), openOperationalActions: new Set() };
    expect(applyUpgrade(empty, [])).toMatchObject({ profilesAdded: 0, assignmentsAdded: 0, actionsAdded: 0 });
    expect(applyUpgrade(empty, ["a", "b", "c"])).toMatchObject({ profilesAdded: 3, assignmentsAdded: 3, actionsAdded: 3 });
  });
});
