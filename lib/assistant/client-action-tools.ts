import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { writeAuditLog } from "@/lib/audit/log";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { normalizeMetricName } from "@/lib/metrics/chart";
import { isFullName } from "@/lib/profile/identity";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sanitizeTimes } from "@/lib/supplements/schedule";
import { isClock, sleepDuration } from "@/lib/sleep/sleep";
import { isUuid } from "@/lib/utils/uuid";
import type { Locale } from "@/lib/i18n/locale";
import type { Receipt, VoiceActor } from "./realtime-server";
import { canUseClientTools } from "./client-case-tools";

const ACTIONS = ["send_professor_message", "save_supplement_schedule", "set_supplement_taken", "update_profile", "save_health_metric", "save_sleep_entry"] as const;
type ActionName = typeof ACTIONS[number];
type Prepared = { action: ActionName; payload: Record<string, unknown>; summaryRu: string; summaryEn: string; entityTable: string };
const ACTION_TABLE: Record<ActionName, string> = {
  send_professor_message: "case_messages",
  save_supplement_schedule: "supplements",
  set_supplement_taken: "supplement_intakes",
  update_profile: "profiles",
  save_health_metric: "health_metrics",
  save_sleep_entry: "sleep_entries"
};

const actionProperties = {
  action: { type: "string", enum: [...ACTIONS] },
  payload: {
    type: "object",
    description: "Fields for the selected action. Supply only values explicitly stated or retrieved from the client's own cabinet; never guess.",
    properties: {
      body: { type: "string", maxLength: 8000 }, supplementId: { type: "string" }, name: { type: "string", maxLength: 120 }, dose: { type: ["string", "null"], maxLength: 120 },
      times: { type: "array", items: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" }, maxItems: 8 }, notes: { type: ["string", "null"], maxLength: 500 },
      taken: { type: "boolean" }, takenOn: { type: "string" }, timeSlot: { type: "string" }, fullName: { type: "string", maxLength: 160 }, phone: { type: ["string", "null"], maxLength: 40 },
      metricId: { type: "string" }, value: { type: "number" }, unit: { type: ["string", "null"], maxLength: 30 }, measuredAt: { type: "string" },
      sleptOn: { type: "string" }, bedtime: { type: "string" }, wakeTime: { type: "string" }, quality: { type: ["integer", "null"], minimum: 1, maximum: 5 }, awakenings: { type: ["integer", "null"], minimum: 0, maximum: 50 }, note: { type: ["string", "null"], maxLength: 500 }
    },
    additionalProperties: false
  }
};

export const CLIENT_ACTION_TOOLS = [
  {
    type: "function" as const,
    name: "prepare_my_cabinet_action",
    description: "Prepare a write to the authenticated client's own cabinet. Supported actions: send a message to Professor Python; add or edit a supplement schedule/reminder; mark an intake taken or not taken; update own name/phone; add or correct an own health metric; add or correct an own sleep entry. This never writes yet. After the tool returns, read its localized summary and ask for a clear confirmation. Never prepare medical advice, a dose invented by AI, payment/document changes, or another person's data.",
    parameters: { type: "object", properties: actionProperties, required: ["action", "payload"], additionalProperties: false }
  },
  {
    type: "function" as const,
    name: "execute_my_cabinet_action",
    description: "Execute one previously prepared client action only after the user clearly confirms the exact summary. Pass the actionId returned by prepare_my_cabinet_action. Never call this in the same user turn as prepare, after ambiguous speech, or after the user changes any detail; prepare a new action instead.",
    parameters: { type: "object", properties: { actionId: { type: "string" }, confirmationToken: { type: "string", maxLength: 40000 } }, required: ["actionId", "confirmationToken"], additionalProperties: false }
  }
] as const;

export const CLIENT_ACTION_RULE = "You can write only the authenticated client's existing self-service cabinet areas through prepare_my_cabinet_action and execute_my_cabinet_action. First retrieve relevant current data when editing an existing record. Preparation never writes. Read the returned localized summary and ask one clear confirmation question. Execute only in a later user turn after an unambiguous yes to that exact summary. If any detail changes, prepare again. Report success only from a completed server receipt. Never change payments, service access, uploaded/source documents, extracted facts, Case state, Professor/Karen decisions, treatment or another person's data. Never invent a supplement, dose, measurement, message or health detail. Sending a message means placing the user's exact text in their Professor Python thread; it does not guarantee a reply.";

const object = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
const nullableText = (value: unknown, max: number) => value == null ? null : text(value, max) || null;
const date = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
const voiceTurn = (value: unknown) => {
  const turn = object(value);
  return turn && typeof turn.id === "string" && turn.id.length > 0 && turn.id.length <= 200 && typeof turn.text === "string" && turn.text.length <= 500 ? { id: turn.id, text: turn.text.trim() } : null;
};
export function isExplicitVoiceConfirmation(value: string) {
  const normalized = value.toLocaleLowerCase().replace(/[.!?]+$/g, "").trim().replace(/\s+/g, " ");
  return /^(да|подтверждаю|да,? подтверждаю|да,? выполняй|выполняй|yes|i confirm|yes,? i confirm|confirm|go ahead)$/.test(normalized);
}
type Confirmation = { actionId: string; profileId: string; receiptId: string; action: ActionName; payload: Record<string, unknown>; summaryRu: string; summaryEn: string; expires: number };
function signConfirmation(value: Confirmation) {
  const key = process.env.ANHAM_REALTIME_SESSION_SECRET?.trim();
  if (!key) return null;
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${createHmac("sha256", key).update(`client-action-v1:${payload}`).digest("base64url")}`;
}
function verifyConfirmation(token: unknown, actor: VoiceActor, receipt: Receipt, actionId: string): Confirmation | null {
  const key = process.env.ANHAM_REALTIME_SESSION_SECRET?.trim();
  if (!key || typeof token !== "string" || token.length > 40000) return null;
  try {
    const [payload, signature, extra] = token.split(".");
    const expected = createHmac("sha256", key).update(`client-action-v1:${payload}`).digest();
    const actual = Buffer.from(signature, "base64url");
    if (extra || expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Confirmation;
    return value.actionId === actionId && value.profileId === actor.profileId && value.receiptId === receipt.id && ACTIONS.includes(value.action) && value.expires >= Date.now() && object(value.payload) ? value : null;
  } catch { return null; }
}

async function prepare(actor: VoiceActor, action: ActionName, raw: Record<string, unknown>): Promise<Prepared | null> {
  const db = createSupabaseServiceClient();
  if (!db) return null;
  if (action === "send_professor_message") {
    const body = typeof raw.body === "string" ? raw.body.trim().slice(0, 8000) : "";
    if (!body || !actor.caseId) return null;
    return { action, payload: { body }, entityTable: "case_messages", summaryRu: `Отправить Professor Python сообщение: «${body}»`, summaryEn: `Send Professor Python this message: “${body}”` };
  }
  if (action === "save_supplement_schedule") {
    const supplementId = raw.supplementId == null ? null : typeof raw.supplementId === "string" && isUuid(raw.supplementId) ? raw.supplementId : "invalid";
    const name = text(raw.name, 120), times = sanitizeTimes(raw.times), dose = nullableText(raw.dose, 120), notes = nullableText(raw.notes, 300);
    if (!name || !times.length || supplementId === "invalid") return null;
    if (supplementId) {
      const current = await db.from("supplements").select("id").eq("id", supplementId).eq("profile_id", actor.profileId).maybeSingle();
      if (current.error || !current.data) return null;
    }
    const timeList = times.join(", ");
    return { action, payload: { supplementId, name, dose, times, notes }, entityTable: "supplements", summaryRu: `${supplementId ? "Изменить" : "Добавить"} в моём расписании: ${name}${dose ? `, ${dose}` : ""}, время ${timeList}`, summaryEn: `${supplementId ? "Update" : "Add"} my schedule: ${name}${dose ? `, ${dose}` : ""} at ${timeList}` };
  }
  if (action === "set_supplement_taken") {
    const supplementId = typeof raw.supplementId === "string" && isUuid(raw.supplementId) ? raw.supplementId : null;
    const takenOn = date(raw.takenOn), timeSlot = text(raw.timeSlot, 5), taken = raw.taken;
    if (!supplementId || !takenOn || !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeSlot) || typeof taken !== "boolean") return null;
    const current = await db.from("supplements").select("id,name,times").eq("id", supplementId).eq("profile_id", actor.profileId).maybeSingle();
    if (current.error || !current.data || !Array.isArray(current.data.times) || !current.data.times.includes(timeSlot)) return null;
    return { action, payload: { supplementId, takenOn, timeSlot, taken }, entityTable: "supplement_intakes", summaryRu: `${taken ? "Отметить" : "Снять отметку"}: ${current.data.name}, ${takenOn} в ${timeSlot}`, summaryEn: `${taken ? "Mark taken" : "Clear taken mark"}: ${current.data.name}, ${takenOn} at ${timeSlot}` };
  }
  if (action === "update_profile") {
    const fullName = raw.fullName == null ? null : text(raw.fullName, 160), phone = raw.phone === undefined ? undefined : nullableText(raw.phone, 40);
    if ((!fullName && phone === undefined) || (fullName && !isFullName(fullName))) return null;
    const parts = [fullName ? `имя: ${fullName}` : null, phone !== undefined ? `телефон: ${phone ?? "убрать"}` : null].filter(Boolean).join(", ");
    const en = [fullName ? `name: ${fullName}` : null, phone !== undefined ? `phone: ${phone ?? "remove"}` : null].filter(Boolean).join(", ");
    return { action, payload: { ...(fullName ? { fullName } : {}), ...(phone !== undefined ? { phone } : {}) }, entityTable: "profiles", summaryRu: `Изменить мои данные, ${parts}`, summaryEn: `Update my account, ${en}` };
  }
  if (action === "save_health_metric") {
    const metricId = raw.metricId == null ? null : typeof raw.metricId === "string" && isUuid(raw.metricId) ? raw.metricId : "invalid";
    const name = normalizeMetricName(text(raw.name, 80)), value = raw.value, unit = nullableText(raw.unit, 30), measuredAt = date(raw.measuredAt);
    if (!name || metricId === "invalid" || typeof value !== "number" || !Number.isFinite(value) || !measuredAt) return null;
    if (metricId) {
      const current = await db.from("health_metrics").select("id").eq("id", metricId).eq("profile_id", actor.profileId).maybeSingle();
      if (current.error || !current.data) return null;
    }
    return { action, payload: { metricId, name, value, unit, measuredAt }, entityTable: "health_metrics", summaryRu: `${metricId ? "Исправить" : "Записать"} мой показатель: ${name} ${value}${unit ? ` ${unit}` : ""}, дата ${measuredAt}`, summaryEn: `${metricId ? "Correct" : "Record"} my metric: ${name} ${value}${unit ? ` ${unit}` : ""}, date ${measuredAt}` };
  }
  const sleptOn = date(raw.sleptOn), bedtime = text(raw.bedtime, 5), wakeTime = text(raw.wakeTime, 5);
  const duration = isClock(bedtime) && isClock(wakeTime) ? sleepDuration(bedtime, wakeTime) : null;
  const quality = raw.quality == null ? null : raw.quality, awakenings = raw.awakenings == null ? null : raw.awakenings, note = nullableText(raw.note, 500);
  if (!sleptOn || duration == null || (quality != null && (!Number.isInteger(quality) || Number(quality) < 1 || Number(quality) > 5)) || (awakenings != null && (!Number.isInteger(awakenings) || Number(awakenings) < 0 || Number(awakenings) > 50))) return null;
  return { action, payload: { sleptOn, bedtime, wakeTime, duration, quality, awakenings, note }, entityTable: "sleep_entries", summaryRu: `Сохранить мою запись сна за ${sleptOn}: с ${bedtime} до ${wakeTime}`, summaryEn: `Save my sleep entry for ${sleptOn}: ${bedtime} to ${wakeTime}` };
}

export async function prepareClientCabinetAction(actor: VoiceActor, args: unknown, receipt: Receipt, locale: Locale, rawUserTurn?: unknown) {
  if (!canUseClientTools(actor)) return { status: "forbidden" };
  const userTurn = voiceTurn(rawUserTurn);
  if (!userTurn) return { status: "invalid" };
  const input = object(args), payload = object(input?.payload);
  if (!input || !payload || typeof input.action !== "string" || !ACTIONS.includes(input.action as ActionName) || Object.keys(input).some(key => key !== "action" && key !== "payload")) return { status: "invalid" };
  const prepared = await prepare(actor, input.action as ActionName, payload);
  if (!prepared) return { status: "invalid", instruction: locale === "ru" ? "Не хватает точных данных или запись не принадлежит этому кабинету." : "Exact information is missing or the record does not belong to this cabinet." };
  const db = createSupabaseServiceClient();
  if (!db) return { status: "unavailable" };
  const actionId = randomUUID(), expires = Math.min(receipt.expires, Date.now() + 10 * 60_000), expiresAt = new Date(expires).toISOString();
  const confirmationToken = signConfirmation({ actionId, profileId: actor.profileId, receiptId: receipt.id, action: prepared.action, payload: prepared.payload, summaryRu: prepared.summaryRu, summaryEn: prepared.summaryEn, expires });
  if (!confirmationToken) return { status: "unavailable" };
  const inserted = await db.from("assistant_client_actions").insert({ id: actionId, profile_id: actor.profileId, case_id: actor.caseId, voice_receipt_id: receipt.id, prepared_turn_id: userTurn.id, action: prepared.action, confirmation_token_hash: createHash("sha256").update(confirmationToken).digest("hex"), expires_at: expiresAt });
  if (inserted.error) return { status: "unavailable" };
  return { status: "confirmation_required", actionId, confirmationToken, summary: locale === "ru" ? prepared.summaryRu : prepared.summaryEn, expiresAt, instruction: locale === "ru" ? "Прочитай итог и спроси: «Подтверждаете?» Не выполняй действие в этой же реплике. Сохрани actionId и confirmationToken для следующей реплики, но никогда не произноси токен." : "Read the summary and ask: “Do you confirm?” Do not execute in this same turn. Retain actionId and confirmationToken for the next turn but never speak the token." };
}

async function perform(actor: VoiceActor, action: ActionName, payload: Record<string, unknown>) {
  const db = createSupabaseServiceClient();
  if (!db) throw new Error("unavailable");
  if (action === "send_professor_message") {
    const row = await db.from("case_messages").insert({ case_id: actor.caseId, profile_id: actor.profileId, sender_id: actor.profileId, sender_role: "client", body: payload.body }).select("id").single();
    if (row.error || !row.data) throw new Error("write");
    await notifyTeam({ kind: "client_message", dedupeKey: `assistant_client_action:${row.data.id}`, title: "💬 Новое сообщение Professor Python", lines: ["Клиент отправил сообщение через голосового Анхама."], link: adminLink(`/admin/cases/${actor.caseId}`) });
    return { entityId: row.data.id };
  }
  if (action === "save_supplement_schedule") {
    const values = { profile_id: actor.profileId, name: payload.name, dose: payload.dose, times: payload.times, notes: payload.notes, is_active: true };
    const row = payload.supplementId ? await db.from("supplements").update(values).eq("id", payload.supplementId).eq("profile_id", actor.profileId).select("id").single() : await db.from("supplements").insert(values).select("id").single();
    if (row.error || !row.data) throw new Error("write"); return { entityId: row.data.id };
  }
  if (action === "set_supplement_taken") {
    if (payload.taken) {
      const row = await db.from("supplement_intakes").upsert({ supplement_id: payload.supplementId, profile_id: actor.profileId, taken_on: payload.takenOn, time_slot: payload.timeSlot }, { onConflict: "supplement_id,taken_on,time_slot" }).select("id").single();
      if (row.error || !row.data) throw new Error("write"); return { entityId: row.data.id };
    }
    const row = await db.from("supplement_intakes").delete().eq("supplement_id", payload.supplementId).eq("profile_id", actor.profileId).eq("taken_on", payload.takenOn).eq("time_slot", payload.timeSlot);
    if (row.error) throw new Error("write"); return { entityId: null };
  }
  if (action === "update_profile") {
    const values = { ...(payload.fullName ? { full_name: payload.fullName } : {}), ...(Object.hasOwn(payload, "phone") ? { phone: payload.phone } : {}) };
    const row = await db.from("profiles").update(values).eq("id", actor.profileId).select("id").single();
    if (row.error || !row.data) throw new Error("write"); return { entityId: actor.profileId };
  }
  if (action === "save_health_metric") {
    const values = { profile_id: actor.profileId, metric_name: payload.name, value: payload.value, unit: payload.unit, measured_at: payload.measuredAt };
    const row = payload.metricId ? await db.from("health_metrics").update(values).eq("id", payload.metricId).eq("profile_id", actor.profileId).select("id").single() : await db.from("health_metrics").insert(values).select("id").single();
    if (row.error || !row.data) throw new Error("write"); return { entityId: row.data.id };
  }
  const row = await db.from("sleep_entries").upsert({ profile_id: actor.profileId, slept_on: payload.sleptOn, bedtime: payload.bedtime, wake_time: payload.wakeTime, duration_minutes: payload.duration, quality: payload.quality, awakenings: payload.awakenings, note: payload.note, source: "manual", updated_at: new Date().toISOString() }, { onConflict: "profile_id,slept_on" }).select("id").single();
  if (row.error || !row.data) throw new Error("write"); return { entityId: row.data.id };
}

export async function executeClientCabinetAction(actor: VoiceActor, args: unknown, receipt: Receipt, locale: Locale, rawUserTurn?: unknown) {
  if (!canUseClientTools(actor)) return { status: "forbidden" };
  const userTurn = voiceTurn(rawUserTurn);
  if (!userTurn || !isExplicitVoiceConfirmation(userTurn.text)) return { status: "confirmation_required", instruction: locale === "ru" ? "Попроси отдельное ясное подтверждение без новых деталей." : "Ask for a separate clear confirmation without new details." };
  const input = object(args), actionId = input && Object.keys(input).every(key => key === "actionId" || key === "confirmationToken") && typeof input.actionId === "string" && isUuid(input.actionId) ? input.actionId : null;
  if (!actionId) return { status: "invalid" };
  const confirmation = verifyConfirmation(input?.confirmationToken, actor, receipt, actionId);
  if (!confirmation) return { status: "invalid", instruction: "The confirmation is missing, changed, expired or belongs to another session. Prepare the action again." };
  const db = createSupabaseServiceClient();
  if (!db) return { status: "unavailable" };
  const tokenHash = createHash("sha256").update(String(input?.confirmationToken)).digest("hex");
  const claimed = await db.from("assistant_client_actions").update({ status: "executing" }).eq("id", actionId).eq("profile_id", actor.profileId).eq("voice_receipt_id", receipt.id).eq("confirmation_token_hash", tokenHash).eq("status", "pending").neq("prepared_turn_id", userTurn.id).gt("expires_at", new Date().toISOString()).select("id,action,confirmation_token_hash").maybeSingle();
  if (claimed.error) return { status: "unavailable" };
  if (!claimed.data) {
    const previous = await db.from("assistant_client_actions").select("status,result").eq("id", actionId).eq("profile_id", actor.profileId).eq("voice_receipt_id", receipt.id).eq("confirmation_token_hash", tokenHash).maybeSingle();
    if (previous.error || !previous.data) return { status: "not_found" };
    return { status: previous.data.status, summary: locale === "ru" ? confirmation.summaryRu : confirmation.summaryEn, receipt: previous.data.result ?? null, instruction: "Never claim success unless status is completed." };
  }
  const row = claimed.data as { action: ActionName; confirmation_token_hash: string };
  try {
    if (row.action !== confirmation.action || row.confirmation_token_hash !== tokenHash) throw new Error("confirmation");
    const performed = await perform(actor, confirmation.action, confirmation.payload);
    const executedAt = new Date().toISOString();
    const result = { actionId, action: row.action, entityId: performed.entityId, executedAt };
    const saved = await db.from("assistant_client_actions").update({ status: "completed", executed_at: executedAt, result }).eq("id", actionId).eq("status", "executing");
    if (saved.error) throw new Error("receipt");
    await writeAuditLog({ profileId: actor.profileId, caseId: actor.caseId, actorId: actor.profileId, actorRole: "client", action: "assistant.client.action.completed", entityTable: ACTION_TABLE[row.action], entityId: performed.entityId, metadata: { action_id: actionId, channel: "voice" } });
    return { status: "completed", summary: locale === "ru" ? confirmation.summaryRu : confirmation.summaryEn, receipt: result, instruction: locale === "ru" ? "Сообщи, что действие выполнено и сохранено в кабинете." : "Say that the action was completed and saved in the cabinet." };
  } catch {
    await db.from("assistant_client_actions").update({ status: "failed", result: { actionId, failedAt: new Date().toISOString() } }).eq("id", actionId).eq("status", "executing");
    return { status: "failed", instruction: locale === "ru" ? "Действие не выполнено. Скажи об этом прямо и предложи повторить позже." : "The action was not completed. Say so directly and offer to try again later." };
  }
}
