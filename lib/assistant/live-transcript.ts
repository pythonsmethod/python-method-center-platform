export type LiveFragment = { id: string; role: "user" | "assistant"; text: string; start: number; end: number };
export function liveFragment(event: Record<string, unknown>): LiveFragment | null {
  if (event.type !== "session.input_transcript.delta" && event.type !== "session.output_transcript.delta") return null;
  if (typeof event.event_id !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(event.event_id) || typeof event.delta !== "string" ||
      event.delta.length > 12000 || typeof event.start_ms !== "number" || typeof event.end_ms !== "number" ||
      !Number.isFinite(event.start_ms) || !Number.isFinite(event.end_ms) || event.start_ms < 0 || event.end_ms < event.start_ms) return null;
  return { id: event.event_id, role: event.type === "session.input_transcript.delta" ? "user" : "assistant", text: event.delta, start: event.start_ms, end: event.end_ms };
}
// A display gap is never used to trigger a backend operation or assume a finished thought.
export function liveMessages(fragments: LiveFragment[]) {
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const f of [...fragments].sort((a,b) => a.start - b.start || a.end - b.end)) {
    if (!f.text) continue;
    const last = messages.at(-1);
    if (last?.role === f.role) last.content += f.text;
    else messages.push({ role: f.role, content: f.text });
  }
  return messages;
}

// Independent speaker lanes preserve overlapping speech. These are display
// groups, never completed turns or authorization to execute a command.
export class LiveDisplay {
  private lanes = new Map<string, { id: string; text: string; end: number }>();
  private groups: { role: string; lane: { id: string; text: string; end: number } }[] = [];
  receive(f: LiveFragment) {
    const previous = this.lanes.get(f.role);
    const lane = previous && f.start - previous.end < 2500 && previous.text.length < 8000
      ? previous : { id: f.id, text: "", end: f.end };
    if (lane !== previous) this.groups.push({ role: f.role, lane });
    lane.text += f.text; lane.end = f.end; this.lanes.set(f.role, lane);
    return { turnId: lane.id, user: f.role === "user" ? lane.text : "", assistant: f.role === "assistant" ? lane.text : "", live: true, continuous: true };
  }
  finish() {
    const result = this.groups.map(({ role, lane }) => ({ turnId: lane.id, user: role === "user" ? lane.text : "", assistant: role === "assistant" ? lane.text : "", live: false, continuous: true }));
    this.lanes.clear(); this.groups = []; return result;
  }
}

export function coalesceLiveHistory<T extends { role: string; content: string; created_at: string; exchange_id?: string | null }>(rows: T[]): T[] {
  const result: T[] = [];
  const lanes = new Map<string, { row: T; end: number }>();
  for (const original of rows) {
    const match = original.exchange_id?.match(/^live:([a-f0-9-]{36}):/);
    if (!match) { result.push(original); lanes.clear(); continue; }
    const key = `${match[1]}:${original.role}`, time = Date.parse(original.created_at), lane = lanes.get(key);
    if (lane && time - lane.end < 2500 && time >= lane.end && lane.row.content.length < 8000) {
      lane.row.content += original.content; lane.end = time;
    } else { const row = { ...original }; result.push(row); lanes.set(key, { row, end: time }); }
  }
  return result;
}
