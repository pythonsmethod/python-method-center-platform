import { AsyncLocalStorage } from "node:async_hooks";
import type { voiceSiteTools } from "./voice-site-tools";

// Request-local capability, created by the authenticated Live server only.
type Context = { tools: ReturnType<typeof voiceSiteTools>; run: (name: unknown, args: unknown) => Promise<Record<string, unknown>> };
const storage = new AsyncLocalStorage<Context>();
export const currentLiveContext = () => storage.getStore();
export const withLiveContext = <T>(context: Context, run: () => Promise<T>) => storage.run(context, run);
