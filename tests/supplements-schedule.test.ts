import { describe, expect, it } from "vitest";
import {
  buildTodaySchedule,
  countDue,
  intakeKey,
  sanitizeTimes
} from "@/lib/supplements/schedule";

const magnesium = {
  id: "s1",
  name: "Магний",
  dose: "2 капсулы",
  times: ["08:00", "20:00"],
  is_active: true
};
const omega = {
  id: "s2",
  name: "Омега-3",
  dose: "1 капсула",
  times: ["13:00"],
  is_active: true
};

describe("today's supplement schedule", () => {
  it("orders the day by time and marks taken / due / upcoming", () => {
    const taken = new Set([intakeKey("s1", "08:00")]);
    const slots = buildTodaySchedule([magnesium, omega], taken, "14:30");

    expect(slots.map((slot) => slot.time)).toEqual([
      "08:00",
      "13:00",
      "20:00"
    ]);
    expect(slots[0].status).toBe("taken");
    expect(slots[1].status).toBe("due"); // 13:00 passed, not checked off
    expect(slots[2].status).toBe("upcoming"); // 20:00 still ahead
    expect(countDue(slots)).toBe(1);
  });

  it("skips paused supplements entirely", () => {
    const slots = buildTodaySchedule(
      [{ ...magnesium, is_active: false }],
      new Set(),
      "12:00"
    );

    expect(slots).toHaveLength(0);
  });
});

describe("time input sanitization", () => {
  it("keeps valid HH:MM, dedupes and sorts", () => {
    expect(sanitizeTimes(["20:00", "08:00", "08:00", "8am", "25:00", ""]))
      .toEqual(["08:00", "20:00"]);
  });

  it("caps the list at eight slots", () => {
    const many = Array.from({ length: 12 }, (_v, i) =>
      `${String(i + 6).padStart(2, "0")}:00`
    );

    expect(sanitizeTimes(many)).toHaveLength(8);
  });

  it("rejects non-arrays", () => {
    expect(sanitizeTimes("08:00")).toEqual([]);
    expect(sanitizeTimes(null)).toEqual([]);
  });
});
