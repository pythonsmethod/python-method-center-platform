import { createSupabaseServiceClient } from "@/lib/supabase/service";

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

export type AuditLogResult =
  | {
      status: "inserted";
    }
  | {
      status: "skipped";
      reason: string;
    }
  | {
      status: "failed";
      reason: string;
    };

export async function writeAuditLog(
  input: AuditLogInput
): Promise<AuditLogResult> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      status: "skipped",
      reason: "Supabase service role key is not configured."
    };
  }

  const { error } = await supabase.from("audit_logs").insert({
    profile_id: input.profileId ?? null,
    case_id: input.caseId ?? null,
    actor_id: input.actorId ?? null,
    actor_role: input.actorRole ?? "system",
    action: input.action,
    entity_table: input.entityTable ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {}
  });

  if (error) {
    return {
      status: "failed",
      reason: error.message
    };
  }

  return { status: "inserted" };
}

export async function writeAuditLogs(
  inputs: AuditLogInput[]
): Promise<AuditLogResult> {
  if (inputs.length === 0) {
    return { status: "inserted" };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      status: "skipped",
      reason: "Supabase service role key is not configured."
    };
  }

  const { error } = await supabase.from("audit_logs").insert(
    inputs.map((input) => ({
      profile_id: input.profileId ?? null,
      case_id: input.caseId ?? null,
      actor_id: input.actorId ?? null,
      actor_role: input.actorRole ?? "system",
      action: input.action,
      entity_table: input.entityTable ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {}
    }))
  );

  if (error) {
    return {
      status: "failed",
      reason: error.message
    };
  }

  return { status: "inserted" };
}
