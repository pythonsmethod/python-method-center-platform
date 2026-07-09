import { createSupabaseServiceClient } from "@/lib/supabase/service";

type ActorRole = "client" | "karen" | "support" | "admin" | "ai" | "system";

export type LifecycleEventType =
  | "case_created"
  | "onboarding_submitted"
  | "status_changed"
  | "payment_recorded"
  | "service_period_started"
  | "service_period_completed"
  | "support_requested"
  | "escalation_created"
  | "consent_recorded"
  | "admin_note_added";

export type LifecycleEventInput = {
  profileId: string;
  caseId: string;
  eventType: LifecycleEventType;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorId?: string | null;
  actorRole?: ActorRole;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

export type LifecycleEventResult =
  | { status: "inserted" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

export async function writeLifecycleEvent(
  input: LifecycleEventInput
): Promise<LifecycleEventResult> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      status: "skipped",
      reason: "Supabase service role key is not configured."
    };
  }

  const { error } = await supabase.from("case_lifecycle_events").insert({
    profile_id: input.profileId,
    case_id: input.caseId,
    event_type: input.eventType,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    actor_id: input.actorId ?? null,
    actor_role: input.actorRole ?? "system",
    notes: input.notes ?? null,
    metadata: input.metadata ?? {}
  });

  if (error) {
    return { status: "failed", reason: error.message };
  }

  return { status: "inserted" };
}

export async function writeLifecycleEvents(
  inputs: LifecycleEventInput[]
): Promise<LifecycleEventResult[]> {
  return Promise.all(inputs.map((input) => writeLifecycleEvent(input)));
}

export type CaseLifecycleEvent = {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  actor_role: string;
  notes: string | null;
  created_at: string;
};
