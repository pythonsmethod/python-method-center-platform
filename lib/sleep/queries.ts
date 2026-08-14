import type { SleepEntry } from "@/lib/sleep/sleep";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SleepResult =
  | { status: "ready"; entries: SleepEntry[] }
  | { status: "unavailable" };

export const SLEEP_HISTORY_DAYS = 60;

function toEntry(row: Record<string, unknown>): SleepEntry {
  return {
    id: String(row.id),
    sleptOn: String(row.slept_on),
    bedtime: row.bedtime ? String(row.bedtime) : null,
    wakeTime: row.wake_time ? String(row.wake_time) : null,
    durationMinutes:
      typeof row.duration_minutes === "number" ? row.duration_minutes : null,
    quality: typeof row.quality === "number" ? row.quality : null,
    awakenings: typeof row.awakenings === "number" ? row.awakenings : null,
    note: row.note ? String(row.note) : null,
    source: String(row.source ?? "manual"),
    device: row.device ? String(row.device) : null
  };
}

// The person's own nights, newest first, under their own session — RLS
// scopes every row to them and no service key is involved.
export async function getSleepEntries(): Promise<SleepResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { status: "unavailable" };
  }

  const { data, error } = await supabase
    .from("sleep_entries")
    .select(
      "id, slept_on, bedtime, wake_time, duration_minutes, quality, awakenings, note, source, device"
    )
    .order("slept_on", { ascending: false })
    .limit(SLEEP_HISTORY_DAYS);

  if (error) {
    return { status: "unavailable" };
  }

  return {
    status: "ready",
    entries: (data ?? []).map((row) => toEntry(row as Record<string, unknown>))
  };
}

// Whether tonight's night is already written down — used for the sidebar
// nudge. Deliberately quiet: a missing table or a logged-out session is a
// zero, never an error page.
export async function hasEntryFor(dateISO: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase
    .from("sleep_entries")
    .select("id")
    .eq("slept_on", dateISO)
    .maybeSingle();

  return !error && Boolean(data);
}
