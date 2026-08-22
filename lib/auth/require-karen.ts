import { getStaffUserState, type StaffUserState } from "@/lib/auth/require-staff";

export function karenAllowlist(): string[] {
  return (process.env.KAREN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

// This assistant contains private case material and unpublished methodology.
// A staff/admin role alone is deliberately insufficient.
export function isKarenAssistantEmail(email: string | null | undefined): boolean {
  return Boolean(email && karenAllowlist().includes(email.toLowerCase()));
}

export async function getKarenAssistantUserState(): Promise<StaffUserState> {
  const state = await getStaffUserState();

  if (state.status !== "authorized") return state;

  return isKarenAssistantEmail(state.email) ? state : { status: "forbidden" };
}
