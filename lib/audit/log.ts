import { AsyncLocalStorage } from "node:async_hooks";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// Server-created request context only. A shared read helper must not label a
// typed request as voice merely because it was first implemented for voice.
const auditChannel = new AsyncLocalStorage<"text" | "voice">();
export const withAuditChannel = <T>(channel: "text" | "voice", work: () => T): T => auditChannel.run(channel, work);
function auditMetadata(input: AuditLogInput) {
  const channel = auditChannel.getStore();
  return channel ? { ...input.metadata, channel } : input.metadata ?? {};
}

type ActorRole = "client" | "karen" | "support" | "admin" | "ai" | "system";
export type AuditLogInput = {
  profileId?: string | null;
  caseId?: string | null;
  actorId?: string | null;
  actorRole?: ActorRole;
  action: string;
  entityTable?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};
export type AuditLogResult = { status: "inserted" } | { status: "skipped"; reason: string } | { status: "failed"; reason: string };

export async function writeAuditLog(input: AuditLogInput): Promise<AuditLogResult> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { status: "skipped", reason: "Supabase service role key is not configured." };
  const { error } = await supabase.from("audit_logs").insert({
    profile_id: input.profileId ?? null,
    case_id: input.caseId ?? null,
    actor_id: input.actorId ?? null,
    actor_role: input.actorRole ?? "system",
    action: input.action,
    entity_table: input.entityTable ?? null,
    entity_id: input.entityId ?? null,
    metadata: auditMetadata(input)
  });
  return error ? { status: "failed", reason: error.message } : { status: "inserted" };
}

export async function writeAuditLogs(inputs: AuditLogInput[]): Promise<AuditLogResult> {
  if (inputs.length === 0) return { status: "inserted" };
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { status: "skipped", reason: "Supabase service role key is not configured." };
  const { error } = await supabase.from("audit_logs").insert(inputs.map(input => ({
    profile_id: input.profileId ?? null,
    case_id: input.caseId ?? null,
    actor_id: input.actorId ?? null,
    actor_role: input.actorRole ?? "system",
    action: input.action,
    entity_table: input.entityTable ?? null,
    entity_id: input.entityId ?? null,
    metadata: auditMetadata(input)
  })));
  return error ? { status: "failed", reason: error.message } : { status: "inserted" };
}
