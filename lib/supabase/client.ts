import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/env";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  browserClient ??= createBrowserClient(config.url, config.anonKey);
  return browserClient;
}
