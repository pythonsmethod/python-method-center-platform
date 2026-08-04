import {
  buildTodaySchedule,
  countDue,
  intakeKey,
  type SupplementRow
} from "@/lib/supplements/schedule";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type IntakeRecord = {
  supplementId: string;
  timeSlot: string;
  takenOn: string;
};

export type SupplementsResult =
  | { status: "ready"; supplements: SupplementRow[]; intakes: IntakeRecord[] }
  | { status: "unavailable" };

function shiftISO(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

// The list plus recent check-offs, both under the person's own session —
// RLS keeps every row theirs. Intakes come with a one-day margin on each
// side of the server's date, because the browser's "today" may not be the
// server's "today"; the client filters to its own local day.
export async function getSupplementsWithToday(
  todayISO: string
): Promise<SupplementsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { status: "unavailable" };
  }

  const [listResult, intakesResult] = await Promise.all([
    supabase
      .from("supplements")
      .select("id, name, dose, times, notes, is_active")
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("supplement_intakes")
      .select("supplement_id, time_slot, taken_on")
      .gte("taken_on", shiftISO(todayISO, -1))
      .lte("taken_on", shiftISO(todayISO, 1))
      .limit(500)
  ]);

  if (listResult.error || intakesResult.error) {
    return { status: "unavailable" };
  }

  const supplements: SupplementRow[] = (listResult.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    dose: row.dose ? String(row.dose) : null,
    notes: row.notes ? String(row.notes) : null,
    times: Array.isArray(row.times) ? row.times.map(String) : [],
    is_active: Boolean(row.is_active)
  }));

  const intakes: IntakeRecord[] = (intakesResult.data ?? []).map((row) => ({
    supplementId: String(row.supplement_id),
    timeSlot: String(row.time_slot),
    takenOn: String(row.taken_on)
  }));

  return { status: "ready", supplements, intakes };
}

// A rough "how many doses are waiting right now" for the sidebar badge.
// Uses the server's clock, so it can be off by a timezone around midnight —
// fine for a nudge; the page itself recomputes on the person's own clock.
export async function getSupplementsDueCount(): Promise<number> {
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const nowHHMM = now.toISOString().slice(11, 16);
  const result = await getSupplementsWithToday(todayISO);

  if (result.status !== "ready") {
    return 0;
  }

  const takenKeys = new Set(
    result.intakes
      .filter((intake) => intake.takenOn === todayISO)
      .map((intake) => intakeKey(intake.supplementId, intake.timeSlot))
  );

  return countDue(buildTodaySchedule(result.supplements, takenKeys, nowHHMM));
}
