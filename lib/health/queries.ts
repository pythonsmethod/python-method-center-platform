import type { QuestionnaireVersion } from "@/lib/health/questionnaire";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { createSupabaseServiceClient } from "@/lib/supabase/service";

export type StoredVersion = QuestionnaireVersion & {
  id: string;
  created_at: string;
};

export type QuestionnaireResult =
  | { status: "ready"; current: StoredVersion | null; history: StoredVersion[] }
  | { status: "unavailable" };

// How far back the cabinet shows. The rows are never deleted; this is only
// how many the page renders at once.
export const HISTORY_LIMIT = 40;

function toVersion(row: Record<string, unknown>): StoredVersion {
  const str = (value: unknown) => (value === null || value === undefined ? null : String(value));
  const num = (value: unknown) => {
    if (value === null || value === undefined) {
      return null;
    }

    // numeric columns come back from PostgREST as strings.
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    id: String(row.id),
    created_at: String(row.created_at),
    birth_date: str(row.birth_date),
    sex: str(row.sex) as StoredVersion["sex"],
    height_cm: num(row.height_cm),
    weight_kg: num(row.weight_kg),
    complaints: str(row.complaints),
    chronic_conditions: str(row.chronic_conditions),
    surgeries: str(row.surgeries),
    allergies: str(row.allergies),
    habits: str(row.habits),
    pregnancy_status: str(row.pregnancy_status) as StoredVersion["pregnancy_status"],
    cycle_status: str(row.cycle_status) as StoredVersion["cycle_status"],
    cycle_note: str(row.cycle_note),
    self_description: str(row.self_description)
  };
}

// The person's own questionnaire under their own session: RLS scopes every
// row to them and no service key is involved.
//
// "Current" is simply the newest row. There is no flag to keep in step and
// no row to update, so the current picture and its history cannot disagree.
export async function getQuestionnaire(): Promise<QuestionnaireResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { status: "unavailable" };
  }

  const { data, error } = await supabase
    .from("health_questionnaire_versions")
    .select(
      "id, created_at, birth_date, sex, height_cm, weight_kg, complaints, chronic_conditions, surgeries, allergies, habits, pregnancy_status, cycle_status, cycle_note, self_description"
    )
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error) {
    return { status: "unavailable" };
  }

  const versions = (data ?? []).map((row) => toVersion(row as Record<string, unknown>));

  return {
    status: "ready",
    current: versions[0] ?? null,
    history: versions.slice(1)
  };
}

// Whether the person has filled the questionnaire at all — for the nudge in
// the cabinet. Deliberately quiet: a missing table or a logged-out session
// is a false, never an error page.
export async function hasQuestionnaire(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return false;
  }

  const { count, error } = await supabase
    .from("health_questionnaire_versions")
    .select("id", { count: "exact", head: true });

  return error ? false : (count ?? 0) > 0;
}

// The newest questionnaire of one person, read with a service client.
//
// The two readers above run under the person's own session and RLS. The
// document worker has no session — it runs for whoever uploaded — so it
// reads through the service role, scoped by an explicit profile id.
export async function getLatestQuestionnaireFor(
  service: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  profileId: string
): Promise<StoredVersion | null> {
  const { data, error } = await service
    .from("health_questionnaire_versions")
    .select(
      "id, created_at, birth_date, sex, height_cm, weight_kg, complaints, chronic_conditions, surgeries, allergies, habits, pregnancy_status, cycle_status, cycle_note, self_description"
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toVersion(data as Record<string, unknown>);
}
