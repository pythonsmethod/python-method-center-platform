import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ service: vi.fn(), audit: vi.fn(), notify: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mocks.service }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: mocks.audit }));
vi.mock("@/lib/notifications/notify", () => ({ notifyTeam: mocks.notify, adminLink: (path: string) => `https://test.local${path}` }));

import { executeClientCabinetAction, isExplicitVoiceConfirmation, prepareClientCabinetAction } from "@/lib/assistant/client-action-tools";
import type { Receipt, VoiceActor } from "@/lib/assistant/realtime-server";

const profileId = "00000000-0000-4000-8000-000000000001";
const caseId = "00000000-0000-4000-8000-000000000002";
const receiptId = "00000000-0000-4000-8000-000000000003";
const entityId = "00000000-0000-4000-8000-000000000004";
const actor: VoiceActor = { profileId, caseId, scope: "client", email: "pilot@example.test", tier: "client", clientPreview: true };
const receipt: Receipt = { id: receiptId, profileId, caseId, scope: "client", locale: "ru", expires: Date.now() + 600_000, dataAccessVersion: 6 };

type Call = { table: string; operation: string; values?: Record<string, unknown>; filters: unknown[][] };
let calls: Call[], pending: Record<string, unknown> | null;

function database() {
  return { from(table: string) {
    const call: Call = { table, operation: "select", filters: [] }; calls.push(call);
    const chain: Record<string, unknown> = {};
    chain.insert = (values: Record<string, unknown>) => { call.operation = "insert"; call.values = values; return chain; };
    chain.update = (values: Record<string, unknown>) => { call.operation = "update"; call.values = values; return chain; };
    chain.delete = () => { call.operation = "delete"; return chain; };
    chain.upsert = (values: Record<string, unknown>) => { call.operation = "upsert"; call.values = values; return chain; };
    chain.select = () => chain;
    for (const method of ["eq", "neq", "gt"]) chain[method] = (...args: unknown[]) => { call.filters.push([method, ...args]); return chain; };
    const result = () => {
      if (table === "assistant_client_actions" && call.operation === "insert") { pending = { ...call.values!, status: "pending", result: null }; return { data: null, error: null }; }
      if (table === "assistant_client_actions" && call.operation === "update" && call.values?.status === "executing") {
        const excludedTurn = call.filters.find(row => row[0] === "neq" && row[1] === "prepared_turn_id")?.[2];
        const matches = pending?.status === "pending" && pending.prepared_turn_id !== excludedTurn && call.filters.some(row => row[1] === "profile_id" && row[2] === profileId) && call.filters.some(row => row[1] === "voice_receipt_id" && row[2] === receiptId);
        if (!matches) return { data: null, error: null };
        pending = { ...pending!, status: "executing" };
        return { data: pending, error: null };
      }
      if (table === "assistant_client_actions" && call.operation === "update") { pending = { ...pending!, ...call.values }; return { data: null, error: null }; }
      if (table === "assistant_client_actions") {
        const sameReceipt = call.filters.some(row => row[1] === "voice_receipt_id" && row[2] === receiptId);
        return { data: sameReceipt ? pending : null, error: null };
      }
      if (table === "supplements" && call.operation === "select") return { data: { id: entityId, name: "Магний", times: ["20:00"] }, error: null };
      if (["case_messages", "supplements", "supplement_intakes", "health_metrics", "sleep_entries", "profiles"].includes(table)) return { data: { id: entityId }, error: null };
      return { data: null, error: null };
    };
    chain.maybeSingle = async () => result(); chain.single = async () => result();
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve);
    return chain;
  } };
}

beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ANHAM_CLIENT_VOICE_TEST_EMAILS", actor.email!); vi.stubEnv("ANHAM_REALTIME_SESSION_SECRET", "test-only-signing-secret-longer-than-32-chars");
  calls = []; pending = null; mocks.service.mockReturnValue(database()); mocks.audit.mockResolvedValue({ status: "inserted" }); mocks.notify.mockResolvedValue("sent");
});
afterEach(() => vi.unstubAllEnvs());

describe("confirmed client cabinet actions", () => {
  it("prepares without writing the requested change, then executes it once after confirmation", async () => {
    const prepared = await prepareClientCabinetAction(actor, { action: "send_professor_message", payload: { body: "Прошу посмотреть мой вопрос." } }, receipt, "ru", { id: "turn-1", text: "Отправь сообщение" });
    expect(prepared).toMatchObject({ status: "confirmation_required", summary: "Отправить Professor Python сообщение: «Прошу посмотреть мой вопрос.»" });
    expect(calls.filter(call => call.table === "case_messages")).toHaveLength(0);
    const storedConfirmation = calls.find(call => call.table === "assistant_client_actions" && call.operation === "insert")?.values;
    expect(storedConfirmation).toMatchObject({ profile_id: profileId, voice_receipt_id: receiptId, action: "send_professor_message", confirmation_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(JSON.stringify(storedConfirmation)).not.toContain("Прошу посмотреть");
    const actionId = "actionId" in prepared ? prepared.actionId : "", confirmationToken = "confirmationToken" in prepared ? prepared.confirmationToken : "";
    expect(await executeClientCabinetAction(actor, { actionId, confirmationToken }, receipt, "ru", { id: "turn-1", text: "Да" })).toMatchObject({ status: "pending" });
    const executed = await executeClientCabinetAction(actor, { actionId, confirmationToken }, receipt, "ru", { id: "turn-2", text: "Да, подтверждаю" });
    expect(executed).toMatchObject({ status: "completed", receipt: { actionId, action: "send_professor_message", entityId } });
    expect(calls.find(call => call.table === "case_messages" && call.operation === "insert")?.values).toMatchObject({ profile_id: profileId, case_id: caseId, sender_role: "client", body: "Прошу посмотреть мой вопрос." });
    expect(mocks.notify).toHaveBeenCalledOnce(); expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ actorId: profileId, actorRole: "client" }));
    expect(await executeClientCabinetAction(actor, { actionId, confirmationToken }, receipt, "ru", { id: "turn-3", text: "Подтверждаю" })).toMatchObject({ status: "completed" });
    expect(calls.filter(call => call.table === "case_messages" && call.operation === "insert")).toHaveLength(1);
  });

  it("creates a cabinet reminder only from explicit supplement details", async () => {
    const prepared = await prepareClientCabinetAction(actor, { action: "save_supplement_schedule", payload: { name: "Магний", dose: null, times: ["20:00"], notes: null } }, receipt, "ru", { id: "turn-1", text: "Поставь магний на восемь вечера" });
    expect(prepared).toMatchObject({ status: "confirmation_required", summary: "Добавить в моём расписании: Магний, время 20:00" });
    const actionId = "actionId" in prepared ? prepared.actionId : "", confirmationToken = "confirmationToken" in prepared ? prepared.confirmationToken : "";
    expect(await executeClientCabinetAction(actor, { actionId, confirmationToken }, receipt, "ru", { id: "turn-2", text: "Да" })).toMatchObject({ status: "completed" });
    expect(calls.find(call => call.table === "supplements" && call.operation === "insert")?.values).toMatchObject({ profile_id: profileId, name: "Магний", dose: null, times: ["20:00"], is_active: true });
  });

  it("rejects unsupported, incomplete, foreign-session and non-client actions", async () => {
    expect(await prepareClientCabinetAction(actor, { action: "change_payment", payload: {} }, receipt, "ru", { id: "turn-1", text: "Измени оплату" })).toMatchObject({ status: "invalid" });
    expect(await prepareClientCabinetAction(actor, { action: "save_supplement_schedule", payload: { name: "Магний", times: [] } }, receipt, "ru", { id: "turn-1", text: "Добавь" })).toMatchObject({ status: "invalid" });
    const prepared = await prepareClientCabinetAction(actor, { action: "update_profile", payload: { phone: "+13105550100" } }, receipt, "en", { id: "turn-1", text: "Change my phone" });
    const actionId = "actionId" in prepared ? prepared.actionId : "", confirmationToken = "confirmationToken" in prepared ? prepared.confirmationToken : "";
    expect(await executeClientCabinetAction(actor, { actionId, confirmationToken }, { ...receipt, id: entityId }, "en", { id: "turn-2", text: "Yes" })).toMatchObject({ status: "invalid" });
    expect(await prepareClientCabinetAction({ ...actor, scope: "founder" }, { action: "update_profile", payload: { phone: "+1" } }, receipt, "ru", { id: "turn-1", text: "Измени" })).toMatchObject({ status: "forbidden" });
  });

  it("requires a short, separate and unambiguous spoken confirmation", () => {
    expect(["Да", "Да, подтверждаю.", "Подтверждаю", "Yes", "Go ahead"].every(isExplicitVoiceConfirmation)).toBe(true);
    expect(["Нет", "Да, но поставь на девять", "Наверное да", "I guess so"].some(isExplicitVoiceConfirmation)).toBe(false);
  });

  it.each([
    ["set_supplement_taken", { supplementId: entityId, takenOn: "2026-09-10", timeSlot: "20:00", taken: true }, "supplement_intakes", "upsert"],
    ["update_profile", { fullName: "Elena Dubrovenko", phone: "+13105550100" }, "profiles", "update"],
    ["save_health_metric", { name: "Ferritin", value: 42, unit: "ng/mL", measuredAt: "2026-09-10" }, "health_metrics", "insert"],
    ["save_sleep_entry", { sleptOn: "2026-09-10", bedtime: "23:00", wakeTime: "07:00", quality: 4, awakenings: 1, note: null }, "sleep_entries", "upsert"]
  ] as const)("executes confirmed %s only in the authenticated cabinet", async (action, payload, table, operation) => {
    const prepared = await prepareClientCabinetAction(actor, { action, payload }, receipt, "en", { id: "turn-1", text: "Prepare this" });
    expect(prepared).toMatchObject({ status: "confirmation_required" });
    const actionId = "actionId" in prepared ? prepared.actionId : "", confirmationToken = "confirmationToken" in prepared ? prepared.confirmationToken : "";
    expect(await executeClientCabinetAction(actor, { actionId, confirmationToken }, receipt, "en", { id: "turn-2", text: "I confirm" })).toMatchObject({ status: "completed" });
    const write = calls.find(call => call.table === table && call.operation === operation);
    expect(write?.values).toMatchObject(table === "profiles" ? { full_name: "Elena Dubrovenko" } : { profile_id: profileId });
  });
});
