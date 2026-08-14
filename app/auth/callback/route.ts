import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { PENDING_EMAIL_COOKIE } from "@/lib/auth/pending-email";
import { attachReferral, REFERRAL_COOKIE } from "@/lib/referrals/queries";
import { createRegistrationProfile } from "@/lib/profile/registration";
import { getLocale } from "@/lib/i18n/locale";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/cabinet";
  }

  return value;
}

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

type SupabaseServerClient = NonNullable<
  Awaited<ReturnType<typeof createSupabaseServerClient>>
>;

// The phone number is the one thing a social sign-in cannot give us: Google
// and Apple hand over an email and a name, never a number. It is left empty
// rather than filled with something invented — the cabinet asks for it in
// the questionnaire, and an empty field is honest about what we know.
async function ensureProfile(
  supabase: SupabaseServerClient,
  request: Request
): Promise<void> {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    // Only when the row is missing. This route also runs for ordinary email
    // confirmations, where the profile already exists and carries a phone
    // number the person typed — and a social sign-in has no number to give,
    // so writing unconditionally would quietly erase it.
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) {
      return;
    }

    await createRegistrationProfile({
      userId: user.id,
      email: user.email ?? "",
      phone: String(user.user_metadata?.phone ?? ""),
      locale: await getLocale()
    });

    const referralCode = request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${REFERRAL_COOKIE}=`))
      ?.slice(REFERRAL_COOKIE.length + 1);

    await attachReferral({
      referredProfileId: user.id,
      rawCode: referralCode ? decodeURIComponent(referralCode) : undefined
    });
  } catch {
    // Deliberately silent: entry is never blocked by a follow-up write.
  }
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

  // Someone arriving through Google or Apple never passed the sign-up form,
  // so nothing has written their profile row yet — they would exist in
  // Supabase Auth and nowhere else: no email the team can see, no row for a
  // case or a referral to point at. Registration by email writes this row
  // itself; this is the same guarantee for the other doors.
  //
  // Both calls are idempotent and both are best-effort: an upsert by id,
  // and an attribution the unique constraint turns into a no-op the second
  // time. Nobody is refused entry because a follow-up write failed.
  await ensureProfile(supabase, request);

  const response = NextResponse.redirect(
    new URL(nextPath, requestUrl.origin)
  );

  // The address is confirmed; nothing is waiting any more.
  response.cookies.set(PENDING_EMAIL_COOKIE, "", { maxAge: 0, path: "/" });

  return response;
}
