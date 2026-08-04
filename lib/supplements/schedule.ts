// The day's schedule, kept pure for tests. What to take is the person's
// own list; this only answers "what is due right now, what is done, what
// is still ahead" for today's checklist and the cabinet reminder.

export type SupplementRow = {
  id: string;
  name: string;
  dose: string | null;
  notes?: string | null;
  times: string[]; // "HH:MM", sorted on write
  is_active: boolean;
};

export type IntakeKey = string; // `${supplementId}|${timeSlot}`

export type TodaySlot = {
  supplementId: string;
  name: string;
  dose: string | null;
  time: string;
  status: "taken" | "due" | "upcoming";
};

export function intakeKey(supplementId: string, time: string): IntakeKey {
  return `${supplementId}|${time}`;
}

// Sorted by time of day, then by name — the order a person lives the day.
export function buildTodaySchedule(
  supplements: SupplementRow[],
  takenKeys: Set<IntakeKey>,
  nowHHMM: string
): TodaySlot[] {
  const slots: TodaySlot[] = [];

  for (const supplement of supplements) {
    if (!supplement.is_active) {
      continue;
    }

    for (const time of supplement.times) {
      const taken = takenKeys.has(intakeKey(supplement.id, time));

      slots.push({
        supplementId: supplement.id,
        name: supplement.name,
        dose: supplement.dose,
        time,
        status: taken ? "taken" : time <= nowHHMM ? "due" : "upcoming"
      });
    }
  }

  return slots.sort(
    (a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name)
  );
}

export function countDue(slots: TodaySlot[]): number {
  return slots.filter((slot) => slot.status === "due").length;
}

// Times from the form: "HH:MM" strings, deduplicated, sorted, capped —
// nobody takes anything twelve times a day, and a runaway list would only
// make the checklist unusable.
export function sanitizeTimes(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const valid = raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => /^([01]\d|2[0-3]):[0-5]\d$/.test(item));

  return [...new Set(valid)].sort().slice(0, 8);
}
