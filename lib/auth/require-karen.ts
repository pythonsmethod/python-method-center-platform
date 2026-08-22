import { getStaffUserState, type StaffUserState } from "@/lib/auth/require-staff";

export function karenAllowlist(): string[] {
  return (process.env.KAREN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

// Karen's assistant contains private case material and his unpublished
// methodology. Access therefore fails closed when the deployment allowlist
// is absent; a staff or admin role alone is deliberately insufficient.
export function isKarenEmail(email: string | null | undefined): boolean {
  return Boolean(email && karenAllowlist().includes(email.toLowerCase()));
}

export async function getKarenUserState(): Promise<StaffUserState> {
  const state = await getStaffUserState();

  if (state.status !== "authorized") return state;

  return isKarenEmail(state.email) ? state : { status: "forbidden" };
}
