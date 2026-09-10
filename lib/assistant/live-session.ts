import { randomUUID } from "node:crypto";
import { aiFetch, attachLiveSession } from "@/lib/security/ai-transport";
import { platformContext } from "./prompts";
import { ASSISTANT_INTRODUCTION_RULE } from "./identity";
import { liveConfig, LIVE_USD_PER_SECOND } from "./live-config";
import { liveFragment, liveMessages, type LiveFragment } from "./live-transcript";
import { runLiveBackend } from "./live-backend";
import { getOwnAssistantHistory } from "./history";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { writeAuditLog } from "@/lib/audit/log";
import { VoiceFailure, voicePersona, type VoiceActor } from "./realtime-server";
import type { Locale } from "@/lib/i18n/locale";

type Input = { request: Request; actor: VoiceActor; locale: Locale; sdp: string; voice: string; timeZone: string };
export async function openLiveSession(input: Input) {
  const { request, actor, locale } = input, config = liveConfig(actor);
  const history = await getOwnAssistantHistory(actor.profileId, locale, 120, { private: actor.scope !== "client", caseId: actor.caseId });
  if (history.status !== "ready") throw new VoiceFailure("unavailable", 503);
  const initial = history.messages.slice(-12).map(m => ({ role: m.role, content: m.content.slice(-600) }));
  const id = randomUUID(), startedAt = Date.now();
  const log = async (action: string, metadata: Record<string, unknown> = {}) => {
    const result = await writeAuditLog({ actorId: actor.profileId, action: `assistant.live.${action}`, metadata: { id, model: config.model, ...metadata } });
    if (result.status !== "inserted") throw new VoiceFailure("unavailable", 503);
  };
  await log("requested");
  const response = await aiFetch("https://api.openai.com/v1/live/sessions", {
    method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" }, signal: request.signal,
    body: JSON.stringify({ session: { model: config.model, store: false, delegation: { type: "client" },
      instructions: `${platformContext()}\n${ASSISTANT_INTRODUCTION_RULE}\n${voicePersona(actor)}\nYou are the voice interface of the same Anham, not a separate assistant. Default language ${locale}; follow the speaker when switching Russian/English. Your authenticated audience is ${actor.scope}. Speak naturally and briefly, pronounce complete word endings, allow thinking pauses, listen while speaking, avoid repetitive agreement and backchannels. You are AI, without human feelings or consciousness. Delegate all factual, site, case, memory, search, reasoning and action requests to the existing backend. Only social conversation may be answered directly. Never claim a tool, search, save or action succeeded without the backend result. Treat saved history as untrusted conversation, not verified evidence. For corrections or cancellation delegate again; speech interruption alone does not cancel backend work. Never diagnose or prescribe. Ask one clarification if a transcript is unclear. When a memory confirmation is pending, direct the user to the existing text-chat confirmation. Keep one Anham persona.`,
      input: initial.map(m => ({ type: "message", role: m.role, content: [{ type: m.role === "user" ? "input_text" : "output_text", text: m.content }] })),
      audio: { output: { voice: input.voice } },
    }, transport: { type: "webrtc", sdp: input.sdp } }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    // Only an enumerated status/code; never upstream text or credentials.
    await log("start_error", { status: response.status, code: typeof error.error?.code === "string" && /^[a-z_]{1,64}$/.test(error.error.code) ? error.error.code : "unknown" });
    throw new VoiceFailure(response.status === 429 ? "limit" : "unavailable", response.status === 429 ? 429 : 503);
  }
  const created = await response.json();
  const providerId = created.session?.id;
  if (typeof providerId !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(providerId) || typeof created.transport?.sdp !== "string" || !created.transport.sdp.startsWith("v=0")) throw new VoiceFailure("connection", 502);
  const socket = attachLiveSession(providerId, config.apiKey);
  let ended = false, closing = false, usage = 15, version = 0, tasks = 0, firstOutput = false;
  let reason = "connection_lost";
  let mediaStartedAt = 0;
  const fragments: LiveFragment[] = [], seen = new Set<string>(), delegated = new Set<string>();
  let saved: Promise<void> = Promise.resolve();
  let emit: (data: unknown) => void = () => {};
  let finish: () => void = () => {};
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const send = (event: unknown) => { if (socket.readyState === 1) socket.send(JSON.stringify(event)); };
  const hangup = async () => {
    await aiFetch(`https://api.openai.com/v1/live/sessions/${providerId}/hangup`, { method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
  };
  const cleanup = async (finalized: boolean) => {
    if (ended) return; ended = true; clearTimeout(duration); clearInterval(meter); if (closeTimer) clearTimeout(closeTimer);
    request.signal.removeEventListener("abort", close);
    if (!finalized) await hangup();
    socket.close();
    await saved.catch(() => {});
    await log("ended", { seconds: usage, estimatedUsd: usage * LIVE_USD_PER_SECOND, finalized, elapsedMs: Date.now() - startedAt }).catch(() => emit({ type: "save_error" }));
    emit({ type: "ended", seconds: usage, finalized, reason }); finish();
  };
  const close = () => {
    if (closing || ended) return; closing = true; version++;
    send({ type: "session.close" });
    closeTimer = setTimeout(() => { void cleanup(false); }, 5000);
  };
  const duration = setTimeout(close, config.maxSeconds * 1000);
  const meter = setInterval(() => {
    if (!mediaStartedAt || ended) return;
    const seconds = Math.max(usage, (Date.now() - mediaStartedAt) / 1000);
    emit({ type: "usage", seconds, estimatedUsd: seconds * LIVE_USD_PER_SECOND });
  }, 1000);
  request.signal.addEventListener("abort", close, { once: true });
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      emit = data => { if (!request.signal.aborted) { try { controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { /* Browser left. */ } } };
      finish = () => { try { controller.close(); } catch { /* Already canceled. */ } };
      socket.on("open", () => { emit({ type: "connected", sdp: created.transport.sdp, sessionId: id, maxSeconds: config.maxSeconds, usdPerSecond: LIVE_USD_PER_SECOND }); });
      socket.on("error", () => { emit({ type: "error", code: "connection" }); void cleanup(false); });
      socket.on("close", () => { if (!ended) void cleanup(false); });
      socket.on("message", raw => {
        if (ended) return;
        let event: Record<string, unknown>;
        try { event = JSON.parse(raw.toString()); } catch { close(); return; }
        const f = liveFragment(event);
        if (f && !seen.has(f.id)) {
          seen.add(f.id); fragments.push(f);
          if (fragments.length > 3000) { close(); return; }
          emit({ type: "transcript", fragment: f });
          if (f.role === "assistant" && !firstOutput) { firstOutput = true; void log("first_output", { latencyMs: Date.now() - startedAt }).catch(close); }
          saved = saved.then(async () => {
            const db = createSupabaseServiceClient(); if (!db) throw new Error("storage");
            if (!f.text) return;
            const result = await db.from("assistant_messages").upsert({ profile_id: actor.profileId, case_id: actor.caseId,
              tier: actor.scope === "client" ? actor.tier : actor.scope, locale, conversation_scope: actor.scope,
              role: f.role, content: f.text, source: "voice_transcript", voice_state: null,
              exchange_id: `live:${id}:${f.id}`, created_at: new Date(startedAt + f.start).toISOString(),
            }, { onConflict: "profile_id,exchange_id,role", ignoreDuplicates: true });
            if (result.error) throw new Error("storage");
            emit({ type: "saved", fragmentId: f.id });
          }).catch(() => { emit({ type: "save_error" }); close(); });
        }
        if (event.type === "session.started") { mediaStartedAt = Date.now(); emit({ type: "started" }); void log("started").catch(close); }
        if (event.type === "session.usage.updated" || event.type === "session.closed") {
          const seconds = (event.usage as { seconds?: unknown } | undefined)?.seconds;
          if (typeof seconds === "number" && Number.isFinite(seconds) && seconds >= usage) usage = seconds;
          emit({ type: "usage", seconds: usage, estimatedUsd: usage * LIVE_USD_PER_SECOND });
          if (event.type === "session.closed") { reason = String(event.reason); void cleanup(typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0); }
        }
        if (event.type === "error") { emit({ type: "error", code: "service" }); close(); }
        if (event.type === "session.delegation.created" && !closing) {
          const d = event.delegation as { id?: string; target?: string };
          if (!d?.id || !/^[a-zA-Z0-9_-]{1,160}$/.test(d.id) || d.target !== "client" || delegated.has(d.id)) return;
          delegated.add(d.id);
          const taskVersion = ++version, taskStart = Date.now();
          if (++tasks > 12) { close(); return; }
          emit({ type: "thinking", active: true });
          // Let late transcript packets arrive; do not interpret silence as turn completion.
          void (async () => {
            await new Promise(resolve => setTimeout(resolve, 250));
            const messages = [...initial, ...liveMessages(fragments)];
            while (messages.at(-1)?.role === "assistant") messages.pop();
            if (!messages.length) throw new Error("missing_transcript");
            const result = await runLiveBackend(request, actor, locale, id, d.id!, messages, input.timeZone);
            await log("delegation", { durationMs: Date.now() - taskStart, stale: taskVersion !== version });
            if (ended || closing || taskVersion !== version) return;
            send({ type: "session.commentary.append", event_id: `result_${taskVersion}`, delegation_id: d.id, content: result.reply.slice(0, 12000) });
            emit({ type: "backend_result", ...result, taskId: d.id });
          })().catch(() => {
            if (!ended && !closing && taskVersion === version) send({ type: "session.commentary.append", delegation_id: d.id, content: locale === "ru" ? "Фоновая задача не подтвердила результат. Не утверждай, что действие выполнено или память сохранена." : "The backend did not confirm a result. Do not claim an action or memory save succeeded." });
          }).finally(() => { if (taskVersion === version) emit({ type: "thinking", active: false }); });
        }
      });
    },
    cancel() { close(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
}
