import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMissingSupabaseEnvVars } from "@/lib/supabase/env";

export type RequiredUserState =
  | {
      status: "missing-env";
      missingEnvVars: string[];
    }
  | {
      status: "authenticated";
      userId: string;
      email: string | null;
    };

export async function getRequiredUser(
  returnTo: string
): Promise<RequiredUserState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      status: "missing-env",
      missingEnvVars: getMissingSupabaseEnvVars()
    };
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  return {
    status: "authenticated",
    userId: user.id,
    email: user.email ?? null
  };
}
