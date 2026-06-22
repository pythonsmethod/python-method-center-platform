export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

const supabaseUrlEnv = "NEXT_PUBLIC_SUPABASE_URL";
const supabaseAnonKeyEnv = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function hasSupabaseEnv(): boolean {
  return getSupabaseConfig() !== null;
}

export function getMissingSupabaseEnvVars(): string[] {
  const missing: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    missing.push(supabaseUrlEnv);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    missing.push(supabaseAnonKeyEnv);
  }

  return missing;
}
