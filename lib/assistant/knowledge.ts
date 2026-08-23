import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type KnowledgeAudience = "client" | "staff" | "both";

export type KnowledgeEntry = {
  id: string;
  title: string;
  content: string;
  audience: KnowledgeAudience;
  is_active: boolean;
  collection?: "general" | "book" | "method" | "client_answers";
  created_at: string;
};

const MAX_PROMPT_ENTRIES = 40;

export async function listKnowledgeEntries(): Promise<{
  entries: KnowledgeEntry[];
  error: string | null;
}> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { entries: [], error: "Supabase недоступен." };
  }

  const { data, error } = await supabase
    .from("assistant_knowledge")
    .select("id, title, content, audience, is_active, collection, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return { entries: [], error: error.message };
  }

  return { entries: (data ?? []) as KnowledgeEntry[], error: null };
}

// Returns active knowledge for one assistant audience, formatted for the
// system prompt. Fails soft: prompt building must never break the chat.
export async function getKnowledgeForPrompt(
  audience: "client" | "staff"
): Promise<string> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return "";
  }

  const { data, error } = await supabase
    .from("assistant_knowledge")
    .select("title, content")
    .eq("is_active", true)
    .in("audience", [audience, "both"])
    .order("created_at", { ascending: true })
    .limit(MAX_PROMPT_ENTRIES);

  if (error || !data || data.length === 0) {
    return "";
  }

  const blocks = data.map(
    (entry) => `### ${entry.title}\n${entry.content}`
  );

  return `\n\n## База знаний центра (составлена командой — опирайся на неё в первую очередь)\n${blocks.join("\n\n")}`;
}

export type GuidanceEntry = {
  id: string;
  title: string;
  content: string;
};

// Professor Python's own guidance on one topic, for showing to the person
// as his words rather than folding into a prompt.
//
// Fails soft and on purpose: the topic column arrives with a migration, and
// a cabinet page must not break on a database that has not been migrated
// yet. Silence is the correct degraded state — a sleep page with no
// guidance card still tracks sleep.
export async function listGuidance(topic: "sleep"): Promise<GuidanceEntry[]> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("assistant_knowledge")
    .select("id, title, content")
    .eq("topic", topic)
    .eq("is_active", true)
    .in("audience", ["client", "both"])
    .order("created_at", { ascending: true })
    .limit(20);

  if (error || !data) {
    return [];
  }

  return data.map((entry) => ({
    id: String(entry.id),
    title: String(entry.title),
    content: String(entry.content)
  }));
}
