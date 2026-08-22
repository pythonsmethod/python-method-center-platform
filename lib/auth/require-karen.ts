import { getStaffUserState, type StaffUserState } from "@/lib/auth/require-staff";
import { isFounderEmail } from "@/lib/auth/require-founder";

export type PrivateAssistantRole = "founder" | "karen";

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

// Founder wins when an address temporarily appears in both allowlists. This
// lets deployments move Anna out of KAREN_EMAILS without ever showing her the
// Karen persona in the meantime.
export function resolvePrivateAssistantRole(
  email: string | null | undefined
): PrivateAssistantRole | null {
  if (isFounderEmail(email)) return "founder";
  if (isKarenAssistantEmail(email)) return "karen";
  return null;
}

export async function getKarenAssistantUserState(): Promise<StaffUserState> {
  const state = await getStaffUserState();

  if (state.status !== "authorized") return state;

  return resolvePrivateAssistantRole(state.email) ? state : { status: "forbidden" };
}
