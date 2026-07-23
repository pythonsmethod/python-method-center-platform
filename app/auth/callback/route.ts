import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/cabinet";
  }

  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(
      new URL("/login?message=supabase-not-configured", requestUrl.origin)
    );
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Expired or already-used link: send the user to a page that explains
      // it and lets them request a fresh one.
      const target =
        nextPath === "/reset-password"
          ? "/recovery?message=link-invalid"
          : "/login?message=link-invalid";

      return NextResponse.redirect(new URL(target, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
