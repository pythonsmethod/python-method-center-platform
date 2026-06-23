import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/env";

let serviceClient: SupabaseClient | null = null;

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("Supabase service role client is server-only.");
  }
}

export function hasSupabaseServiceRoleEnv(): boolean {
  assertServerRuntime();
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function createSupabaseServiceClient(): SupabaseClient | null {
  assertServerRuntime();

  const config = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!config || !serviceRoleKey) {
    return null;
  }

  serviceClient ??= createClient(config.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return serviceClient;
}
