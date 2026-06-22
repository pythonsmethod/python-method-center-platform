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
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
