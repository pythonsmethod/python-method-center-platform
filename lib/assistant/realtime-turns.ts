import { validWebResult, type WebResult } from "./web-results";
export type VoiceExchange = { turnId: string; user: string; assistant: string; state?: "interrupted"; webResults?: WebResult[]; webReceipts?: string[] };
export type VoiceTranscript = VoiceExchange & { live?: boolean };
export type VoiceToolCall = { id: string; call_id: string; name: string; arguments: string };
type Output = { id?: string; type?: string; call_id?: string; name?: string; arguments?: string; content?: { type?: string; transcript?: string }[] };
type Input = { id: string; text?: string; failed?: boolean };
type Active = { input: Input; responseId?: string; outputIds?: string[]; text?: string; done: boolean; played: boolean; interrupted: boolean; toolsPending: boolean; toolRounds: number; chainIds: string[]; webResults?: WebResult[]; webReceipts?: string[] };
type Event = { type?: string; item_id?: string; transcript?: string; delta?: string; response_id?: string; response?: { id?: string; status?: string; metadata?: { input_item_id?: string }; output?: Output[] } };
type Options = { onTranscript?: (text: VoiceTranscript) => void; tool?: (call: VoiceToolCall, userTurn: { id: string; text: string }) => Promise<unknown> };

// One active input owns every audio and tool response in its turn. Nothing is
// matched by arrival time or by the newest message visible in the UI.
export class RealtimeTurns {
  private inputs: Input[] = [];
  private seen = new Set<string>();
  private active: Active | null = null;
  private contextIds: string[] = [];
  private closed = false;
  constructor(private send: (event: unknown) => void, private completed: (pair: VoiceExchange) => void, private incomplete: () => void, private options: Options = {}) {}

  receive(event: Event) {
    if (this.closed) return;
    if (event.type === "input_audio_buffer.speech_started" && this.active) {
      this.active.interrupted = true;
      if (this.active.done || this.active.toolsPending) this.finish(false);
    }
    if (event.type === "input_audio_buffer.committed" && event.item_id && !this.seen.has(event.item_id)) {
      this.seen.add(event.item_id); this.inputs.push({ id: event.item_id });
    }
    if (event.type === "conversation.item.input_audio_transcription.completed" || event.type === "conversation.item.input_audio_transcription.failed") {
      const input = this.inputs.find(item => item.id === event.item_id);
      if (input) {
        input.text = event.transcript?.trim(); input.failed = !input.text || input.text.length > 12_000;
        if (!input.failed) this.options.onTranscript?.({ turnId: input.id, user: input.text!, assistant: "", live: true });
      }
    }
    if (event.type === "response.created" && this.active && event.response?.metadata?.input_item_id === this.active.input.id) this.active.responseId = event.response.id;
    if (event.type === "response.output_audio_transcript.delta" && this.active?.responseId && event.response_id === this.active.responseId && typeof event.delta === "string") {
      this.active.text = ((this.active.text ?? "") + event.delta).slice(0, 12_000);
      this.preview(this.active);
    }
    if (event.type === "response.done" && this.active && event.response && this.active.responseId && event.response.id === this.active.responseId && !this.active.done) {
      const active = this.active;
      active.done = true;
      active.outputIds = (event.response.output ?? []).flatMap(item => item.id ? [item.id] : []);
      const calls = (event.response.output ?? []).filter((item): item is Output & VoiceToolCall => item.type === "function_call" && !!item.id && !!item.call_id && !!item.name && typeof item.arguments === "string");
      const text = event.response.output?.flatMap(item => item.content ?? []).filter(part => part.type === "audio" || part.type === "output_audio").map(part => part.transcript ?? "").join("\n").trim();
      if (text) active.text = text;
      if (event.response.status !== "completed" || active.interrupted) this.finish(false);
      else if (calls.length) {
        if (calls.length > 3 || active.toolRounds >= 12) this.finish(false);
        else { active.toolsPending = true; void this.resolveTools(active, calls); }
      } else if (!active.text || active.text.length > 12_000) this.finish(false);
      else { this.preview(active); if (active.played) this.finish(true); }
    }
    if (event.type === "output_audio_buffer.stopped" && this.active?.responseId && event.response_id === this.active.responseId) {
      this.active.played = true;
      if (this.active.done && !this.active.toolsPending) this.finish(!this.active.interrupted);
    }
    if (event.type === "output_audio_buffer.cleared" && this.active?.responseId && event.response_id === this.active.responseId) {
      this.active.interrupted = true;
      if (this.active.done) this.finish(false);
    }
    this.pump();
  }
  private webFields(active: Active) { return active.webResults?.length ? { webResults: active.webResults, webReceipts: active.webReceipts } : {}; }
  private preview(active: Active) { this.options.onTranscript?.({ turnId: active.input.id, user: active.input.text!, assistant: active.text ?? "", live: true, ...this.webFields(active) }); }
  private async resolveTools(active: Active, calls: VoiceToolCall[]) {
    active.toolRounds++;
    active.chainIds.push(...(active.outputIds ?? []));
    for (const call of calls) {
      let output: unknown;
      try { output = call.name === "search_web" && (active.webResults?.length ?? 0) >= 3 ? { error: "limit", instruction: "Search limit reached for this turn. Use only existing sources." } : this.options.tool ? await this.options.tool(call, { id: active.input.id, text: active.input.text! }) : { error: "unavailable" }; } catch { output = { error: "unavailable", instruction: "Say the requested data could not be read. Never invent an answer." }; }
      if (this.closed || this.active !== active || active.interrupted) return;
      if (call.name === "search_web" && output && typeof output === "object") {
        const { webReceipt, ...data } = output as Record<string, unknown>;
        if (validWebResult(data.webResult) && typeof webReceipt === "string" && (active.webResults?.length ?? 0) < 3) {
          (active.webResults ??= []).push(data.webResult);
          (active.webReceipts ??= []).push(webReceipt);
        }
        output = data; // Signing tokens are for persistence, never model context.
      }
      const id = crypto.randomUUID().replaceAll("-", "");
      this.send({ type: "conversation.item.create", item: { id, type: "function_call_output", call_id: call.call_id, output: JSON.stringify(output) } });
      active.chainIds.push(id);
    }
    if (this.closed || this.active !== active) return;
    active.done = false; active.played = false; active.toolsPending = false; active.responseId = undefined;
    active.text = undefined;
    this.requestResponse(active);
  }
  private finish(save: boolean) {
    const active = this.active; this.active = null;
    if (active?.input.text) {
      const pair: VoiceExchange = { turnId: active.input.id, user: active.input.text, assistant: active.text?.slice(0, 12_000) ?? "", ...(!save ? { state: "interrupted" as const } : {}), ...this.webFields(active) };
      this.options.onTranscript?.(pair); this.completed(pair);
      if (save) this.contextIds.push(active.input.id, ...active.chainIds, ...(active.outputIds ?? []));
    }
    if (!save) this.incomplete();
  }
  private requestResponse(active: Active) {
    this.send({ type: "response.create", response: { metadata: { input_item_id: active.input.id }, input: [...this.contextIds, active.input.id, ...active.chainIds].map(id => ({ type: "item_reference", id })) } });
  }
  private pump() {
    if (this.active || this.closed) return;
    while (this.inputs[0]?.failed) { this.inputs.shift(); this.incomplete(); }
    if (!this.inputs[0]?.text) return;
    const input = this.inputs.shift()!;
    this.active = { input, done: false, played: false, interrupted: false, toolsPending: false, toolRounds: 0, chainIds: [] };
    this.requestResponse(this.active);
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.active) this.finish(false);
    for (const input of this.inputs) {
      if (input.text && !input.failed) {
        const pair: VoiceExchange = { turnId: input.id, user: input.text, assistant: "", state: "interrupted" };
        this.options.onTranscript?.(pair); this.completed(pair);
      }
    }
    if (this.inputs.length) this.incomplete();
    this.inputs = [];
  }
}
