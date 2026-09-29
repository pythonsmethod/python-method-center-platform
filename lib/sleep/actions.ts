"use server";

import { revalidatePath } from "next/cache";
import { normalizeAnhamResponse } from "@/lib/assistant/response-style";
import { askAssistantTeam } from "@/lib/assistant/router";
import { listGuidance } from "@/lib/assistant/knowledge";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";
import { apiError, assistantFailure } from "@/lib/i18n/api-errors";
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
import { getLocale, type Locale } from "@/lib/i18n/locale";
import { plural } from "@/lib/i18n/plural";

const MAX_IMPORT_BYTES = 3_000_000;

function errorState(message: string): SleepActionState {
  return { status: "error", message };
}

const localized = (locale: Locale, ru: string, en: string) => locale === "ru" ? ru : en;

function localizedSkipReason(reason: string, locale: Locale): string {
  if (locale === "ru") return reason;
  if (reason === "В файле нет строк с данными.") return "The file does not contain any data rows.";
  if (reason.startsWith("Не нашёл столбец с датой.")) return "No date column was found. Add a “date” column or a wake-time column that includes a date.";
  if (reason.startsWith("Прочитаны первые ")) return `Only the first ${MAX_IMPORT_ROWS} nights were imported; the remaining rows were skipped.`;
  if (reason === "Не разобрал дату в этой строке.") return "The date in this row could not be read.";
  const duplicate = reason.match(/^Ночь (.+) уже была выше в файле — оставил первую\.$/);
  if (duplicate) return `Night ${duplicate[1]} appears more than once in the file; the first row was kept.`;
  const empty = reason.match(/^Ночь (.+): в строке нет ни времени сна, ни продолжительности\.$/);
  if (empty) return `Night ${empty[1]} has neither sleep times nor a duration.`;
  return "This row could not be imported.";
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
  const locale = await getLocale();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(localized(locale, SERVICE_UNAVAILABLE_MESSAGE, "The service is temporarily unavailable."));
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return errorState(localized(locale, "Сессия истекла — войдите заново.", "Your session has expired. Please sign in again."));
  }

  const sleptOn = String(formData.get("slept_on") ?? "").trim();
  const bedtime = String(formData.get("bedtime") ?? "").trim();
  const wakeTime = String(formData.get("wake_time") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
  const rawQuality = String(formData.get("quality") ?? "").trim();
  const rawAwakenings = String(formData.get("awakenings") ?? "").trim();

  if (!isSaneDate(sleptOn)) {
    return errorState(localized(locale, "Укажите дату утра, когда вы проснулись.", "Enter the date of the morning you woke up."));
  }

  if (!isClock(bedtime) || !isClock(wakeTime)) {
    return errorState(localized(locale, "Укажите время отхода ко сну и время подъёма.", "Enter both your bedtime and wake-up time."));
  }

  const durationMinutes = sleepDuration(bedtime, wakeTime);

  if (durationMinutes === null) {
    return errorState(localized(locale, "Время засыпания и подъёма совпадают — проверьте, пожалуйста.", "Bedtime and wake-up time are the same. Please check them."));
  }

  const quality = rawQuality ? Number(rawQuality) : null;
  const awakenings = rawAwakenings ? Number(rawAwakenings) : null;

  if (quality !== null && (!Number.isInteger(quality) || quality < 1 || quality > 5)) {
    return errorState(localized(locale, "Оценка самочувствия — от 1 до 5.", "Rate how you feel from 1 to 5."));
  }

  if (
    awakenings !== null &&
    (!Number.isInteger(awakenings) || awakenings < 0 || awakenings > 50)
  ) {
    return errorState(localized(locale, "Количество пробуждений указано некорректно.", "Enter a valid number of awakenings."));
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
    return errorState(localized(locale, "Не удалось сохранить. Попробуйте ещё раз — а если повторится, напишите в поддержку.", "Could not save the night. Try again, and contact support if it happens again."));
  }

  refresh();

  return { status: "success", message: localized(locale, "Ночь записана.", "Night saved.") };
}

export async function removeNight(
  _previous: SleepActionState,
  formData: FormData
): Promise<SleepActionState> {
  const locale = await getLocale();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(localized(locale, SERVICE_UNAVAILABLE_MESSAGE, "The service is temporarily unavailable."));
  }

  const id = String(formData.get("entry_id") ?? "");
  const { error } = await supabase.from("sleep_entries").delete().eq("id", id);

  if (error) {
    return errorState(localized(locale, "Не удалось удалить запись.", "Could not delete the entry."));
  }

  refresh();

  return { status: "success", message: localized(locale, "Запись удалена.", "Entry deleted.") };
}

// Bringing in a file a watch, ring or bracelet exported.
//
// Nothing is guessed: rows that cannot be read are reported back with their
// line numbers so the person can open the file and see for themselves.
export async function importNights(
  _previous: SleepImportState,
  formData: FormData
): Promise<SleepImportState> {
  const locale = await getLocale();
  const fail = (message: string): SleepImportState => ({
    status: "error",
    message,
    imported: 0,
    skipped: [],
    recognized: []
  });

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return fail(localized(locale, SERVICE_UNAVAILABLE_MESSAGE, "The service is temporarily unavailable."));
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return fail(localized(locale, "Сессия истекла — войдите заново.", "Your session has expired. Please sign in again."));
  }

  const file = formData.get("file");
  const device = String(formData.get("device") ?? "").trim().slice(0, 80) || null;

  if (!(file instanceof File) || file.size === 0) {
    return fail(localized(locale, "Выберите файл выгрузки из приложения устройства.", "Choose the export file from your device app."));
  }

  if (file.size > MAX_IMPORT_BYTES) {
    return fail(localized(locale, "Файл слишком большой. Выгрузите период поменьше — например, последний месяц.", "The file is too large. Export a shorter period, such as the last month."));
  }

  const text = await file.text();
  const parsed = parseSleepCsv(text);
  const nights = parsed.nights.filter(isPlausibleNight);
  const skipped = parsed.skipped.map((row) => locale === "ru"
    ? `Строка ${row.line}: ${row.reason}`
    : `Row ${row.line}: ${localizedSkipReason(row.reason, locale)}`);

  if (nights.length === 0) {
    return {
      status: "error",
      message: localized(locale, "Из этого файла не удалось прочитать ни одной ночи. Проверьте, что это выгрузка сна в формате CSV.", "No nights could be read from this file. Check that it is a sleep export in CSV format."),
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
      message: localized(locale, "Не удалось сохранить ночи из файла. Попробуйте ещё раз.", "Could not save the nights from this file. Please try again."),
      imported: 0,
      skipped,
      recognized: parsed.recognized
    };
  }

  refresh();

  return {
    status: "success",
    message: locale === "ru"
      ? `Перенесено ночей: ${nights.length}.`
      : `${nights.length} ${plural(nights.length, { rule: "en", one: "night", few: "nights", many: "nights" })} imported.`,
    imported: nights.length,
    skipped,
    recognized: parsed.recognized
  };
}

export async function getSleepAdvice(
  _previous: SleepAdviceState,
  _formData: FormData
): Promise<SleepAdviceState> {
  const locale = await getLocale();
  const result = await getSleepEntries();

  if (result.status !== "ready" || result.entries.length === 0) {
    return {
      status: "error",
      advice: "",
      message: locale === "en"
        ? "Record at least one night first so there is something to discuss."
        : "Сначала запишите хотя бы одну ночь, тогда будет о чём говорить."
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
      message: answer.status === "unavailable"
        ? apiError("assistantTemporarilyDown", locale)
        : assistantFailure(answer, locale)
    };
  }

  const advice = normalizeAnhamResponse(answer.reply, locale);
  return advice
    ? { status: "success", advice, message: "" }
    : { status: "error", advice: "", message: apiError("assistantEmptyReply", locale) };
}
