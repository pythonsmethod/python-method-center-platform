import { AsyncLocalStorage } from "node:async_hooks";
import type { voiceSiteTools } from "./voice-site-tools";

// Server-authenticated, request-local tools shared by voice and the Karen text
// API. Carrying this context does not create a voice session or change identity.
type Context = { tools: Array<ReturnType<typeof voiceSiteTools>[number]>; run: (name: unknown, args: unknown) => Promise<Record<string, unknown>>; channel?: "text" | "voice"; maxToolRounds?: number };
const storage = new AsyncLocalStorage<Context>();
export const currentLiveContext = () => storage.getStore();
export const withLiveContext = <T>(context: Context, run: () => Promise<T>) => storage.run(context, run);
export function assistantToolRoundLimit(): number {
  const value = storage.getStore()?.maxToolRounds;
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 8 ? value : 4;
}
