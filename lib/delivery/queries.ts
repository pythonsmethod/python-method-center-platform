import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { DELIVERY_PROFILE_COLUMNS, type DeliveryProfile, type DeliveryTask, type DeliveryVolunteer } from "@/lib/delivery/types";

async function withDocumentUrls(db: NonNullable<ReturnType<typeof createSupabaseServiceClient>>, tasks: DeliveryTask[]) {
  return Promise.all(tasks.map(async task => {
    if (!task.shipment_document_path) return { ...task, documentUrl: null };
    const { data } = await db.storage.from("shipment-documents").createSignedUrl(task.shipment_document_path, 3600);
    return { ...task, documentUrl: data?.signedUrl ?? null };
  }));
}

export async function getClientDelivery(profileId: string) {
  const db = createSupabaseServiceClient();
  if (!db) return { profile: null, tasks: [], error: "Database is not configured." };
  const [{ data: profile, error }, { data: tasks }] = await Promise.all([
    db.from("profiles").select(DELIVERY_PROFILE_COLUMNS).eq("id", profileId).maybeSingle(),
    db.from("delivery_tasks").select("*").eq("client_profile_id", profileId).order("created_at", { ascending: false })
  ]);
  await db.from("delivery_tasks").update({ client_viewed_at: new Date().toISOString() })
    .eq("client_profile_id", profileId).eq("status", "shipped").is("client_viewed_at", null);
  return { profile: profile as DeliveryProfile | null, tasks: await withDocumentUrls(db, (tasks ?? []) as DeliveryTask[]), error: error?.message ?? null };
}

export async function getClientDeliveryUnreadCount(profileId: string): Promise<number> {
  const db = createSupabaseServiceClient();
  if (!db) return 0;
  const { count } = await db.from("delivery_tasks").select("id", { count: "exact", head: true })
    .eq("client_profile_id", profileId).eq("status", "shipped").is("client_viewed_at", null);
  return count ?? 0;
}

export async function getVolunteerDeliveryTasks(volunteerId: string) {
  const db = createSupabaseServiceClient();
  if (!db) return { tasks: [], error: "Database is not configured." };
  const { data, error } = await db.from("delivery_tasks").select("*").eq("volunteer_id", volunteerId).order("created_at", { ascending: false });
  return { tasks: (data ?? []) as DeliveryTask[], error: error?.message ?? null };
}

export async function getDeliveryOverview() {
  const db = createSupabaseServiceClient();
  if (!db) return { tasks: [], error: "Database is not configured." };
  const [{ data, error }, { data: volunteers }] = await Promise.all([
    db.from("delivery_tasks").select("*").order("created_at", { ascending: false }),
    db.from("profiles").select("id, full_name, email").eq("role", "volunteer").eq("status", "active").order("full_name")
  ]);
  return { tasks: await withDocumentUrls(db, (data ?? []) as DeliveryTask[]), volunteers: (volunteers ?? []) as DeliveryVolunteer[], error: error?.message ?? null };
}

export async function getDeliveryAttentionCounts() {
  const db = createSupabaseServiceClient();
  if (!db) return { admin: 0 };
  const { count } = await db.from("delivery_tasks").select("id", { count: "exact", head: true })
    .or("volunteer_id.is.null,status.eq.problem");
  return { admin: count ?? 0 };
}
