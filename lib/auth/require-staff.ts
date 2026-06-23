import { redirect } from "next/navigation";
import { getMissingSupabaseEnvVars } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffRole = "support" | "admin";

export type StaffUserState =
  | {
      status: "missing-env";
      missingEnvVars: string[];
    }
  | {
      status: "unauthenticated";
    }
  | {
      status: "forbidden";
    }
  | {
      status: "error";
      message: string;
    }
  | {
      status: "authorized";
      userId: string;
      email: string | null;
      role: StaffRole;
    };

function isStaffRole(value: unknown): value is StaffRole {
  return value === "support" || value === "admin";
}

export async function getStaffUserState(): Promise<StaffUserState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      status: "missing-env",
      missingEnvVars: getMissingSupabaseEnvVars()
    };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "unauthenticated" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      status: "error",
      message: profileError.message
    };
  }

  if (
    !profile ||
    !isStaffRole(profile.role) ||
    profile.status === "suspended" ||
    profile.status === "closed"
  ) {
    return { status: "forbidden" };
  }

  return {
    status: "authorized",
    userId: user.id,
    email: profile.email ?? user.email ?? null,
    role: profile.role
  };
}

export async function getRequiredStaffUser(
  returnTo: string
): Promise<Exclude<StaffUserState, { status: "unauthenticated" }>> {
  const state = await getStaffUserState();

  if (state.status === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  return state;
}
