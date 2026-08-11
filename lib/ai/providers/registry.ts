import { anthropicProvider } from "@/lib/ai/providers/anthropic";
import { openAiProvider } from "@/lib/ai/providers/openai";
import type { AIProvider, AIProviderId, ProviderHealth } from "@/lib/ai/core/types";

// Who exists, and in what order they are preferred.
//
// A new provider joins the product by being implemented and added to this
// list. Nothing else in the codebase learns its name — that is the promise
// the whole migration is for.

export const ALL_PROVIDERS: readonly AIProvider[] = [anthropicProvider, openAiProvider];

// Claude first, as the running site does today. Preserved deliberately: the
// order is a product decision that predates this file, and a migration is not
// the place to quietly change who answers a client first.
export const DEFAULT_PRIORITY: readonly AIProviderId[] = ["anthropic", "openai"];

// Order can be re-decided in deployment via AI_PROVIDER_PRIORITY. Names that
// do not exist are ignored rather than fatal — a typo in configuration should
// not take the assistant off the site — and any provider left unnamed keeps
// its default place at the back, so a partial list can never make one
// disappear.
export function providerPriority(): AIProviderId[] {
  const configured = (process.env.AI_PROVIDER_PRIORITY ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const known = new Set(ALL_PROVIDERS.map((provider) => provider.id));
  const order: AIProviderId[] = [];

  for (const id of [...configured, ...DEFAULT_PRIORITY]) {
    if (known.has(id) && !order.includes(id)) {
      order.push(id);
    }
  }

  for (const provider of ALL_PROVIDERS) {
    if (!order.includes(provider.id)) {
      order.push(provider.id);
    }
  }

  return order;
}

export function getProviders(): AIProvider[] {
  const byId = new Map(ALL_PROVIDERS.map((provider) => [provider.id, provider]));

  return providerPriority()
    .map((id) => byId.get(id))
    .filter((provider): provider is AIProvider => Boolean(provider));
}

export function getProvider(id: AIProviderId): AIProvider | null {
  return ALL_PROVIDERS.find((provider) => provider.id === id) ?? null;
}

// For the staff panel and for answering "why did it use that one" without
// reading code. Carries no keys and no client content.
export async function providerHealth(): Promise<ProviderHealth[]> {
  return Promise.all(
    getProviders().map(async (provider) => ({
      id: provider.id,
      label: provider.label,
      configured: await provider.isAvailable(),
      capabilities: [...provider.capabilities()]
    }))
  );
}
