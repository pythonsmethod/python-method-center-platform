import { getStaffUserState, type StaffUserState } from "./require-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAssistantDelegate } from "./assistant-delegates";

type PrivateState = Exclude<StaffUserState, { status: "authorized" }> | { status: "authorized"; userId: string; email: string | null; role: "admin" | "support" | "client" };
export async function getPrivateAssistantUserState(): Promise<PrivateState> {
  const staff = await getStaffUserState();
  if (staff.status !== "forbidden") return staff;
  const db = await createSupabaseServerClient();
  if (!db) return { status: "forbidden" };
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user || user.is_anonymous || !isAssistantDelegate(user.email)) return { status: "forbidden" };
  const profile = await db.from("profiles").select("role,status").eq("id", user.id).maybeSingle();
  if (profile.error || !profile.data || profile.data.role !== "client" || ["suspended", "closed"].includes(profile.data.status)) return { status: "forbidden" };
  return { status: "authorized", userId: user.id, email: user.email ?? null, role: "client" };
}
