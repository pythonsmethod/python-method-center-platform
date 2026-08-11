import { getStaffUserState, type StaffUserState } from "@/lib/auth/require-staff";

export function founderAllowlist(): string[] {
  return (process.env.FOUNDER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

// Cabinet access. An empty allowlist means "any admin", which is how the
// platform has always run.
export function isFounderEmail(email: string | null | undefined): boolean {
  const allowlist = founderAllowlist();

  if (allowlist.length === 0) {
    return true;
  }

  return Boolean(email && allowlist.includes(email.toLowerCase()));
}

// Who may see which model is answering.
//
// Deliberately stricter than cabinet access, and deliberately fails closed:
// with no allowlist configured, nobody sees a vendor name — not the team,
// not Professor Python. The founder decided that everyone else simply uses
// the assistant, and an empty environment variable must not quietly turn
// that back on.
export function canSeeProviderNames(email: string | null | undefined): boolean {
  const allowlist = founderAllowlist();

  if (allowlist.length === 0) {
    return false;
  }

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
