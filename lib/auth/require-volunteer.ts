import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type VolunteerUserState =
  | { status: "missing-env" | "forbidden" }
  | { status: "authorized"; userId: string; email: string | null };

export async function getRequiredVolunteer(returnTo: string): Promise<VolunteerUserState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "missing-env" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  const { data: profile } = await supabase.from("profiles").select("email, role, status").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "volunteer" || ["suspended", "closed"].includes(profile.status)) return { status: "forbidden" };
  return { status: "authorized", userId: user.id, email: profile.email ?? user.email ?? null };
}
