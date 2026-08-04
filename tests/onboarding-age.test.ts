import { describe, expect, it } from "vitest";

// Clause 7 of the offer allows participation under 21 only together with a
// parent or legal guardian. The age is computed from the date of birth
// rather than taken from a checkbox, so the rule is worth pinning: a
// birthday that has not happened yet this year must not round a person up
// into being old enough.
function yearsSince(isoDate: string, now: Date): number | null {
  const born = new Date(isoDate);

  if (Number.isNaN(born.getTime())) {
    return null;
  }

  let years = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) {
    years -= 1;
  }

  return years;
}

const NOW = new Date("2026-08-04T12:00:00Z");

describe("participant age", () => {
  it("counts a birthday that has already passed this year", () => {
    expect(yearsSince("2005-01-10", NOW)).toBe(21);
  });

  it("does not count a birthday still to come this year", () => {
    expect(yearsSince("2005-12-10", NOW)).toBe(20);
  });

  it("does not count a birthday later this month", () => {
    expect(yearsSince("2005-08-30", NOW)).toBe(20);
  });

  it("counts the birthday itself", () => {
    expect(yearsSince("2005-08-04", NOW)).toBe(21);
  });

  it("rejects a date it cannot read", () => {
    expect(yearsSince("not a date", NOW)).toBeNull();
  });

  it("puts someone born 21 years ago on the adult side of the line", () => {
    const age = yearsSince("2000-03-01", NOW);
    expect(age).not.toBeNull();
    expect((age as number) >= 21).toBe(true);
  });

  it("keeps a fifteen-year-old on the guardian side of the line", () => {
    const age = yearsSince("2011-03-01", NOW);
    expect(age).not.toBeNull();
    expect((age as number) >= 21).toBe(false);
  });
});
