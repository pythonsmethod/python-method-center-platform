"use server";

import type {
  SupplementActionState,
  TimingAdviceState
} from "@/lib/supplements/action-state";
import { revalidatePath } from "next/cache";
import { askClaude } from "@/lib/assistant/claude";
import { sanitizeTimes } from "@/lib/supplements/schedule";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MAX_EXTRACTED_SUPPLEMENTS, readExtractedSupplement } from "@/lib/supplements/extraction";



function errorState(message: string): SupplementActionState {
  return { status: "error", message };
}

// All client-owned data under the client's own session — RLS scopes every
// statement to their profile; no service key involved anywhere here.

export async function addSupplement(
  _previous: SupplementActionState,
  formData: FormData
): Promise<SupplementActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return errorState("Сессия истекла — войдите заново.");
  }

  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const dose = String(formData.get("dose") ?? "").trim().slice(0, 120) || null;
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 300) || null;
  const times = sanitizeTimes(formData.getAll("times").map(String));

  if (!name || name.length > 120) {
    return errorState("Укажите название — например, «Магний» или «Витамин D».");
  }

  if (times.length === 0) {
    return errorState("Добавьте хотя бы одно время приёма.");
  }

  const { error } = await supabase.from("supplements").insert({
    profile_id: user.id,
    name,
    dose,
    notes,
    times,
    is_active: true
  });

  if (error) {
    return errorState(
      "Не удалось сохранить. Попробуйте ещё раз — а если повторится, напишите в поддержку."
    );
  }

  revalidatePath("/cabinet/supplements");
  revalidatePath("/cabinet");

  return { status: "success", message: `«${name}» добавлен в расписание.` };
}

export async function saveExtractedSupplements(
  _previous: SupplementActionState,
  formData: FormData
): Promise<SupplementActionState> {
  const locale = formData.get("locale") === "en" ? "en" : "ru";
  const supabase = await createSupabaseServerClient();
  if (!supabase) return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorState(locale === "en" ? "Your session has expired. Please sign in again." : "Сессия истекла — войдите заново.");

  let parsed: unknown;
  try { parsed = JSON.parse(String(formData.get("rows") ?? "[]")); }
  catch { return errorState(locale === "en" ? "Could not read the selected rows." : "Не удалось прочитать выбранные строки."); }
  if (!Array.isArray(parsed) || parsed.length === 0) return errorState(locale === "en" ? "Select at least one supplement." : "Выберите хотя бы одну добавку.");

  const rows = parsed.slice(0, MAX_EXTRACTED_SUPPLEMENTS).map(readExtractedSupplement)
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  if (!rows.length) return errorState(locale === "en" ? "No rows passed validation. Add them manually." : "Ни одна строка не прошла проверку — внесите вручную.");

  const { error } = await supabase.from("supplements").insert(rows.map((row) => ({
    profile_id: user.id, name: row.name, dose: row.dose,
    times: row.times, notes: [row.notes, row.timing_note].filter(Boolean).join(" · ").slice(0, 300) || null,
    is_active: true
  })));
  if (error) return errorState(locale === "en" ? "Could not save the schedule. Please try again." : "Не удалось сохранить расписание. Попробуйте ещё раз.");
  revalidatePath("/cabinet/supplements"); revalidatePath("/cabinet");
  return { status: "success", message: locale === "en" ? `Added to schedule: ${rows.length}.` : `Добавлено в расписание: ${rows.length}.` };
}

export async function removeSupplement(
  _previous: SupplementActionState,
  formData: FormData
): Promise<SupplementActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const id = String(formData.get("supplement_id") ?? "");
  const { error } = await supabase.from("supplements").delete().eq("id", id);

  if (error) {
    return errorState("Не удалось удалить.");
  }

  revalidatePath("/cabinet/supplements");
  revalidatePath("/cabinet");

  return { status: "success", message: "Убрано из расписания." };
}

// The check-off. Pressing an already-taken slot un-checks it — fingers
// slip, and honesty about what was actually taken matters more than a
// pretty streak.
export async function toggleIntake(
  _previous: SupplementActionState,
  formData: FormData
): Promise<SupplementActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return errorState("Сессия истекла — войдите заново.");
  }

  const supplementId = String(formData.get("supplement_id") ?? "");
  const timeSlot = String(formData.get("time_slot") ?? "");
  const takenOn = String(formData.get("taken_on") ?? "");

  if (!supplementId || !/^\d{4}-\d{2}-\d{2}$/.test(takenOn)) {
    return errorState("Некорректный запрос.");
  }

  const { data: existing } = await supabase
    .from("supplement_intakes")
    .select("id")
    .eq("supplement_id", supplementId)
    .eq("taken_on", takenOn)
    .eq("time_slot", timeSlot)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("supplement_intakes").delete().eq("id", existing.id)
    : await supabase.from("supplement_intakes").insert({
        supplement_id: supplementId,
        profile_id: user.id,
        taken_on: takenOn,
        time_slot: timeSlot
      });

  if (error) {
    return errorState("Не удалось отметить приём.");
  }

  revalidatePath("/cabinet/supplements");
  revalidatePath("/cabinet");

  return { status: "success", message: "" };
}



// The one thing the AI is allowed to do here: comment on TIMING for the
// list the person entered themselves. It never suggests what to take, what
// to add, or how much — those decisions belong to the person and their
// specialist. The prompt says so, and the reply is capped short.
const TIMING_SYSTEM_PROMPT = `Ты помощник Python's Method Center. Человек сам составил список добавок и время приёма. Твоя единственная задача — подсказать, удачно ли выбрано ВРЕМЯ приёма, и как его при желании скорректировать: утро или вечер, с едой или натощак, что лучше разнести по времени между собой.

Жёсткие правила:
- НИКОГДА не советуй, ЧТО принимать: не предлагай новые добавки, не оценивай сам выбор, не называй дозировки и не советуй их менять.
- Не ставь диагнозов и не давай лечебных назначений. Что и сколько принимать — решает человек со своим специалистом.
- Пиши по-русски, тепло и коротко: по одной-две строки на добавку, без вступлений и заключений.
- Если сочетание добавок в списке обычно разносят по времени (например, железо и кальций, железо и магний), мягко об этом напомни.
- В конце одной строкой напомни: это общие ориентиры по времени, а не медицинская рекомендация.`;

export async function getTimingAdvice(
  _previous: TimingAdviceState,
  _formData: FormData
): Promise<TimingAdviceState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { status: "error", advice: "", message: SERVICE_UNAVAILABLE_MESSAGE };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      advice: "",
      message: "Сессия истекла — войдите заново."
    };
  }

  const { data, error } = await supabase
    .from("supplements")
    .select("name, dose, times, is_active")
    .eq("is_active", true)
    .limit(100);

  if (error || !data || data.length === 0) {
    return {
      status: "error",
      advice: "",
      message: "Сначала добавьте хотя бы одну добавку — тогда будет что обсуждать."
    };
  }

  const list = data
    .map((row) => {
      const times = Array.isArray(row.times) ? row.times.join(", ") : "";

      return `— ${row.name}${row.dose ? ` (${row.dose})` : ""}: приём в ${times}`;
    })
    .join("\n");

  const result = await askClaude(
    TIMING_SYSTEM_PROMPT,
    [
      {
        role: "user",
        content: `Вот моё расписание добавок:\n${list}\n\nПодскажи по времени приёма.`
      }
    ],
    700
  );

  if (result.status !== "ok") {
    return {
      status: "error",
      advice: "",
      message:
        result.status === "unavailable"
          ? "ИИ-помощник сейчас не настроен. Попробуйте позже."
          : result.message
    };
  }

  return { status: "success", advice: result.reply, message: "" };
}
