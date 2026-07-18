import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type KnowledgeAudience = "client" | "staff" | "both";

export type KnowledgeEntry = {
  id: string;
  title: string;
  content: string;
  audience: KnowledgeAudience;
  is_active: boolean;
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
    .select("id, title, content, audience, is_active, created_at")
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
