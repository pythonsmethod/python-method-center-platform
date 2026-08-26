import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { PENDING_EMAIL_COOKIE } from "@/lib/auth/pending-email";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/auth/safe-next-path";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email"
];

function readOtpType(value: string | null): EmailOtpType | null {
  return OTP_TYPES.includes(value as EmailOtpType)
    ? (value as EmailOtpType)
    : null;
}

// Where a person lands when the link did not work. Recovery has its own
// page that offers a fresh link; everyone else goes to the page that can
// send a new confirmation letter.
function failurePath(type: EmailOtpType | null, nextPath: string): string {
  return type === "recovery" || nextPath === "/reset-password"
    ? "/recovery?message=link-invalid"
    : "/check-email?message=link-invalid";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const params = requestUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = readOtpType(params.get("type"));
  const nextPath = sanitizeNextPath(params.get("next"));
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(
      new URL("/login?message=supabase-not-configured", requestUrl.origin)
    );
  }

  // Supabase reports its own refusals — an expired link, a used one — in
  // the query string. Reading them here means the person gets the page
  // that can help instead of a silent redirect to a login form.
  if (params.get("error") || params.get("error_code")) {
    return NextResponse.redirect(
      new URL(failurePath(type, nextPath), requestUrl.origin)
    );
  }

  let verified = false;

  if (tokenHash && type) {
    // The letter is very often opened somewhere other than the browser it
    // was requested from — registered on the laptop, mail read on the
    // phone. A token hash can be verified anywhere; the PKCE code below
    // cannot, because its verifier lives in the original browser only.
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type
    });

    verified = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    verified = !error;
  } else {
    // Neither shape present: nothing to verify, so treat it as a link that
    // did not survive the trip rather than pretending it worked.
    return NextResponse.redirect(
      new URL(failurePath(type, nextPath), requestUrl.origin)
    );
  }

  if (!verified) {
    return NextResponse.redirect(
      new URL(failurePath(type, nextPath), requestUrl.origin)
    );
  }

  const response = NextResponse.redirect(
    new URL(nextPath, requestUrl.origin)
  );

  // The address is confirmed; nothing is waiting any more.
  response.cookies.set(PENDING_EMAIL_COOKIE, "", { maxAge: 0, path: "/" });

  return response;
}
