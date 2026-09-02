"use server";

import { revalidatePath } from "next/cache";
import { askAssistantTeam } from "@/lib/assistant/router";
import { listGuidance } from "@/lib/assistant/knowledge";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";
import type {
  SleepActionState,
  SleepAdviceState,
  SleepImportState
} from "@/lib/sleep/action-state";
import {
  isPlausibleNight,
  MAX_IMPORT_ROWS,
  parseSleepCsv
} from "@/lib/sleep/import";
import {
  describeForAssistant,
  isClock,
  sleepDuration,
  summarize
} from "@/lib/sleep/sleep";
import { SLEEP_ADVICE_SYSTEM_PROMPT } from "@/lib/sleep/prompt";
import { getSleepEntries } from "@/lib/sleep/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_IMPORT_BYTES = 3_000_000;

function errorState(message: string): SleepActionState {
  return { status: "error", message };
}

function refresh(): void {
  revalidatePath("/cabinet/sleep");
  revalidatePath("/cabinet");
}

// A person may write down a night that has already happened, and tonight's
// night up to tomorrow's date — clocks differ by hours across the countries
// this platform serves. Anything further ahead is a typo.
function isSaneDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const limit = new Date();
  limit.setUTCDate(limit.getUTCDate() + 1);

  return value >= "2020-01-01" && value <= limit.toISOString().slice(0, 10);
}

export async function saveNight(
  _previous: SleepActionState,
  formData: FormData
): Promise<SleepActionState> {
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

  const sleptOn = String(formData.get("slept_on") ?? "").trim();
  const bedtime = String(formData.get("bedtime") ?? "").trim();
  const wakeTime = String(formData.get("wake_time") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
  const rawQuality = String(formData.get("quality") ?? "").trim();
  const rawAwakenings = String(formData.get("awakenings") ?? "").trim();

  if (!isSaneDate(sleptOn)) {
    return errorState("Укажите дату утра, когда вы проснулись.");
  }

  if (!isClock(bedtime) || !isClock(wakeTime)) {
    return errorState("Укажите время отхода ко сну и время подъёма.");
  }

  const durationMinutes = sleepDuration(bedtime, wakeTime);

  if (durationMinutes === null) {
    return errorState(
      "Время засыпания и подъёма совпадают — проверьте, пожалуйста."
    );
  }

  const quality = rawQuality ? Number(rawQuality) : null;
  const awakenings = rawAwakenings ? Number(rawAwakenings) : null;

  if (quality !== null && (!Number.isInteger(quality) || quality < 1 || quality > 5)) {
    return errorState("Оценка самочувствия — от 1 до 5.");
  }

  if (
    awakenings !== null &&
    (!Number.isInteger(awakenings) || awakenings < 0 || awakenings > 50)
  ) {
    return errorState("Количество пробуждений указано некорректно.");
  }

  const { error } = await supabase.from("sleep_entries").upsert(
    {
      profile_id: user.id,
      slept_on: sleptOn,
      bedtime,
      wake_time: wakeTime,
      duration_minutes: durationMinutes,
      quality,
      awakenings,
      note,
      source: "manual",
      updated_at: new Date().toISOString()
    },
    { onConflict: "profile_id,slept_on" }
  );

  if (error) {
    return errorState(
      "Не удалось сохранить. Попробуйте ещё раз — а если повторится, напишите в поддержку."
    );
  }

  refresh();

  return { status: "success", message: "Ночь записана." };
}

export async function removeNight(
  _previous: SleepActionState,
  formData: FormData
): Promise<SleepActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const id = String(formData.get("entry_id") ?? "");
  const { error } = await supabase.from("sleep_entries").delete().eq("id", id);

  if (error) {
    return errorState("Не удалось удалить запись.");
  }

  refresh();

  return { status: "success", message: "Запись удалена." };
}

// Bringing in a file a watch, ring or bracelet exported.
//
// Nothing is guessed: rows that cannot be read are reported back with their
// line numbers so the person can open the file and see for themselves.
export async function importNights(
  _previous: SleepImportState,
  formData: FormData
): Promise<SleepImportState> {
  const fail = (message: string): SleepImportState => ({
    status: "error",
    message,
    imported: 0,
    skipped: [],
    recognized: []
  });

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return fail(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return fail("Сессия истекла — войдите заново.");
  }

  const file = formData.get("file");
  const device = String(formData.get("device") ?? "").trim().slice(0, 80) || null;

  if (!(file instanceof File) || file.size === 0) {
    return fail("Выберите файл выгрузки из приложения устройства.");
  }

  if (file.size > MAX_IMPORT_BYTES) {
    return fail(
      "Файл слишком большой. Выгрузите период поменьше — например, последний месяц."
    );
  }

  const text = await file.text();
  const parsed = parseSleepCsv(text);
  const nights = parsed.nights.filter(isPlausibleNight);
  const skipped = parsed.skipped.map(
    (row) => `Строка ${row.line}: ${row.reason}`
  );

  if (nights.length === 0) {
    return {
      status: "error",
      message:
        "Из этого файла не удалось прочитать ни одной ночи. Проверьте, что это выгрузка сна в формате CSV.",
      imported: 0,
      skipped,
      recognized: parsed.recognized
    };
  }

  const { error } = await supabase.from("sleep_entries").upsert(
    nights.slice(0, MAX_IMPORT_ROWS).map((night) => ({
      profile_id: user.id,
      slept_on: night.sleptOn,
      bedtime: night.bedtime,
      wake_time: night.wakeTime,
      duration_minutes: night.durationMinutes,
      quality: night.quality,
      awakenings: night.awakenings,
      source: "import",
      device,
      updated_at: new Date().toISOString()
    })),
    { onConflict: "profile_id,slept_on" }
  );

  if (error) {
    return {
      status: "error",
      message: "Не удалось сохранить ночи из файла. Попробуйте ещё раз.",
      imported: 0,
      skipped,
      recognized: parsed.recognized
    };
  }

  refresh();

  return {
    status: "success",
    message: `Перенесено ночей: ${nights.length}.`,
    imported: nights.length,
    skipped,
    recognized: parsed.recognized
  };
}

export async function getSleepAdvice(
  _previous: SleepAdviceState,
  formData: FormData
): Promise<SleepAdviceState> {
  const result = await getSleepEntries();

  if (result.status !== "ready" || result.entries.length === 0) {
    return {
      status: "error",
      advice: "",
      message:
        "Сначала запишите хотя бы одну ночь — тогда будет о чём говорить."
    };
  }

  const stats = summarize(result.entries);
  const guidance = await listGuidance("sleep");
  const karen =
    guidance.length > 0
      ? `\n\n## Принципы центра по сну (их написал Professor Python — опирайся на них в первую очередь и не противоречь им)\n${guidance
          .map((entry) => `### ${entry.title}\n${entry.content}`)
          .join("\n\n")}`
      : "";

  const locale = String(formData.get("locale") ?? "ru");
  const language =
    locale === "en"
      ? "\n\nЧеловек читает английскую версию сайта — ответь по-английски."
      : "";

  const answer = await askAssistantTeam(
    `${SLEEP_ADVICE_SYSTEM_PROMPT}${karen}${language}`,
    [
      {
        role: "user",
        content: `Вот мои записи сна за последнее время (ночей: ${stats.nights}).\n\n${describeForAssistant(
          result.entries
        )}\n\nЧто видно по этим записям и что можно поправить в режиме?`
      }
    ],
    900
  );

  if (answer.status !== "ok") {
    return {
      status: "error",
      advice: "",
      message:
        answer.status === "unavailable"
          ? "ИИ-помощник сейчас не настроен. Попробуйте позже."
          : answer.message
    };
  }

  return { status: "success", advice: answer.reply, message: "" };
}
