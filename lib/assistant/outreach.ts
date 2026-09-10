import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

// Mirrors the migration predicate; integration tests exercise both against
// the same explicit commands. Broad matching deliberately favors stopping.
export function isExplicitOutreachRefusal(text: string): boolean {
  return /(не (пиши|пишите|присылай|присылайте|отправляй|отправляйте)|отписаться|отпишите|отписываюсь|unsubscribe|stop (messaging|sending|writing)|do not (message|send|write)|don['’]?t (message|send|write))/i.test(text);
}

export function isAssistantOutreachEnabled(): boolean {
  return process.env.ASSISTANT_OUTREACH_ENABLED === "true";
}

export async function deliverAssistantOutreach(profileId?: string): Promise<number> {
  if (!isAssistantOutreachEnabled()) return 0;
  // Optional rollout scope. An explicitly configured empty/malformed list must
  // never fall back to a global send, especially on shared staging databases.
  const configuredScope = process.env.ASSISTANT_OUTREACH_PROFILE_IDS;
  const allowed = configuredScope === undefined ? null : configuredScope.split(",").map((id) => id.trim());
  if (allowed && (allowed.length > 100 || allowed.some((id) => !isUuid(id)))) {
    throw new Error("Invalid assistant outreach scope");
  }
  if (profileId && allowed && !allowed.includes(profileId)) return 0;
  const service = createSupabaseServiceClient();
  if (!service) throw new Error("Assistant outreach unavailable");
  const targets = profileId ? [profileId] : allowed ? [...new Set(allowed)] : [null];
  let sent = 0;
  for (const target of targets) {
    const { data, error } = await service.rpc("deliver_assistant_outreach", {
      p_profile_id: target,
      p_welcome_only: Boolean(profileId),
      p_limit: target ? 1 : 100
    });
    if (error || typeof data !== "number") throw new Error("Assistant outreach delivery failed");
    sent += data;
  }
  return sent;
}

export async function tryAssistantWelcome(profileId: string): Promise<void> {
  try {
    await deliverAssistantOutreach(profileId);
  } catch {
    // Registration stays available. The daily cron retries missing welcomes.
    console.error("assistant-welcome-deferred");
  }
}

export async function stopAssistantOutreach(profileId: string): Promise<void> {
  const service = createSupabaseServiceClient();
  if (!service) throw new Error("Assistant outreach unavailable");
  const { error } = await service.from("assistant_outreach_state").upsert(
    { profile_id: profileId, opted_out: true }, { onConflict: "profile_id" }
  );
  if (error) throw new Error("Assistant outreach preference failed");
}
