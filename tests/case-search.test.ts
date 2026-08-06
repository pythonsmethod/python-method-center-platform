import { describe, expect, it } from "vitest";
import { searchCases } from "@/lib/cases/search";
import type { StaffCaseListItem } from "@/lib/cases/staff-queries";

// Finding one client in the list.
//
// It exists because of a real moment during the focus group: a payment
// arrived from an address, the alert said no account matched it, and the
// only way to check was to scroll the table by eye on a phone. The question
// "do we know this person?" has to be answerable in one go — a wrong answer
// there means either chasing someone who is already a client, or recording
// money against the wrong person.

function makeCase(
  overrides: Partial<StaffCaseListItem> & {
    profiles?: { full_name?: string | null; email?: string | null; phone?: string | null };
  } = {}
): StaffCaseListItem {
  return {
    id: "aaaaaaaa-1111-2222-3333-444444444444",
    title: null,
    status: "new",
    urgency: "normal",
    created_at: "2026-08-05T10:00:00.000Z",
    ...overrides,
    profiles: {
      full_name: null,
      email: null,
      phone: null,
      ...(overrides.profiles ?? {})
    }
  } as StaffCaseListItem;
}

const CASES = [
  makeCase({
    id: "11111111-aaaa-bbbb-cccc-dddddddddddd",
    profiles: {
      full_name: "Nargiza",
      email: "nnaserjanova@gmail.com",
      phone: "+996702645977"
    }
  }),
  makeCase({
    id: "22222222-aaaa-bbbb-cccc-dddddddddddd",
    profiles: {
      full_name: "Irina",
      email: "irnazarchuk@gmail.com",
      phone: "+375333768292"
    }
  }),
  makeCase({
    id: "33333333-aaaa-bbbb-cccc-dddddddddddd",
    title: "Восстановление после химиотерапии",
    profiles: {
      full_name: "Anna Dubrovenko",
      email: "pythonmethod@gmail.com",
      phone: "4244050044"
    }
  })
];

describe("searching for a client", () => {
  it("finds them by any part of an email", () => {
    expect(searchCases(CASES, "irnazarchuk")).toHaveLength(1);
    expect(searchCases(CASES, "@gmail.com")).toHaveLength(3);
  });

  it("finds them by name, whatever the case", () => {
    expect(searchCases(CASES, "NARGIZA")[0].profiles?.full_name).toBe("Nargiza");
    expect(searchCases(CASES, "dubrovenko")[0].profiles?.full_name).toBe(
      "Anna Dubrovenko"
    );
  });

  it("finds them by a phone number written any way at all", () => {
    // The same number to a person, three different strings to a computer.
    for (const typed of ["+996702645977", "996 702 645 977", "8-996-702-64-59-77"]) {
      expect(searchCases(CASES, typed), typed).toHaveLength(1);
    }
  });

  it("finds a case by the short id shown in the table", () => {
    expect(searchCases(CASES, "33333333")).toHaveLength(1);
  });

  it("searches what the case is about, not only who it belongs to", () => {
    expect(searchCases(CASES, "химиотерапии")).toHaveLength(1);
  });

  it("returns everything when nothing is asked for", () => {
    expect(searchCases(CASES, "")).toHaveLength(3);
    expect(searchCases(CASES, "   ")).toHaveLength(3);
  });

  it("says nothing rather than everything when there is no match", () => {
    // The answer that matters: this address belongs to nobody we have. A
    // search that quietly returns the whole table instead would send
    // someone looking for an account that is not there.
    expect(searchCases(CASES, "zaven_97@icloud.com")).toHaveLength(0);
  });

  it("does not match half the table on two stray digits", () => {
    // "44" appears in two of these phone numbers. A search that fires on it
    // reads as broken, so numbers need at least four digits to count.
    expect(searchCases(CASES, "44")).toHaveLength(0);
  });
});
