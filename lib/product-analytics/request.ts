import { createHash } from "node:crypto";
import { clientIp } from "@/lib/utils/client-ip";

const hits = new Map<string, { count: number; until: number }>();
// Burst protection only, not a global bot filter. No IP is persisted.
export function allowAnalyticsRequest(request: Request) {
  const now = Date.now();
  const key = createHash("sha256").update(clientIp(request.headers)).digest("hex");
  if (hits.size >= 5000) for (const [id, value] of hits) if (value.until <= now) hits.delete(id);
  const old = hits.get(key);
  if (old && old.until > now) return ++old.count <= 30;
  if (hits.size >= 5000) return false;
  hits.set(key, { count: 1, until: now + 60000 });
  return true;
}

export async function smallAnalyticsBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 256) { await reader.cancel(); throw new Error("Body too large"); }
    chunks.push(part.value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
