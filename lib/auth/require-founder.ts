import { getStaffUserState, type StaffUserState } from "@/lib/auth/require-staff";

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

  const allowlist = (process.env.FOUNDER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length > 0) {
    const email = state.email?.toLowerCase();

    if (!email || !allowlist.includes(email)) {
      return { status: "forbidden" };
    }
  }

  return state;
}
