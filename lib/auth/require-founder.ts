import { getStaffUserState, type StaffUserState } from "@/lib/auth/require-staff";

// The platform creator must never lose founder access because a deployment
// variable is missing or stale. Additional founder accounts can still be
// supplied through FOUNDER_EMAILS.
export const PRIMARY_FOUNDER_EMAIL = "dubrovenkoanna@gmail.com";

export function founderAllowlist(): string[] {
  return [PRIMARY_FOUNDER_EMAIL, ...(process.env.FOUNDER_EMAILS ?? "").split(",")]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

// Cabinet access is restricted to the platform creator and any explicitly
// configured additional founder accounts.
export function isFounderEmail(email: string | null | undefined): boolean {
  const allowlist = founderAllowlist();
  return Boolean(email && allowlist.includes(email.toLowerCase()));
}

// Who may see which model is answering.
//
// Only the platform creator and explicitly configured additional founders
// see vendor names; everyone else simply uses the assistant.
export function canSeeProviderNames(email: string | null | undefined): boolean {
  const allowlist = founderAllowlist();
  return Boolean(email && allowlist.includes(email.toLowerCase()));
}

// The founder cabinet is a read-only observability view over the whole
// platform. It is narrower than /admin: role must be `admin`, and when
// FOUNDER_EMAILS is set (comma-separated), the email must be on that list.
export async function getFounderState(): Promise<StaffUserState> {
  const state = await getStaffUserState();

  if (state.status !== "authorized") {
    return state;
  }

  if (state.role !== "admin") {
    return { status: "forbidden" };
  }

  if (!isFounderEmail(state.email)) {
    return { status: "forbidden" };
  }

  return state;
}
