import { isFounderEmail } from "@/lib/auth/require-founder";

export function resolveStaffLandingPath(
  role: string | null | undefined,
  email: string | null | undefined
): "/admin" | "/admin/founder" | null {
  if (role !== "admin" && role !== "support") return null;
  return role === "admin" && isFounderEmail(email) ? "/admin/founder" : "/admin";
}
