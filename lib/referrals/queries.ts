import { generateReferralCode, normalizeReferralCode } from "@/lib/referrals/code";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const REFERRAL_COOKIE = "pm-ref";

export type ReferralInvitee = {
  createdAt: string;
  email: string | null;
  hasCase: boolean;
  hasPaid: boolean;
};

export type ReferralSummary = {
  status: "ready" | "unavailable";
  code: string | null;
  invited: number;
  started: number;
  paid: number;
  invitees: ReferralInvitee[];
};

// Returns the client's personal token, creating it on first use. Retries a
// few times so a rare code collision cannot fail the cabinet render.
export async function ensureReferralCode(
  profileId: string
): Promise<string | null> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", profileId)
    .maybeSingle();

  if (profile?.referral_code) {
    return profile.referral_code;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCode();
    const { error } = await supabase
      .from("profiles")
      .update({ referral_code: code })
      .eq("id", profileId);

    if (!error) {
      return code;
    }

    // 23505 = unique violation: the generated code is taken, try again.
    if (error.code !== "23505") {
      return null;
    }
  }

  return null;
}

// Records who invited whom. Called once, right after sign-up. Never throws:
// a broken attribution must not block registration.
export async function attachReferral(input: {
  referredProfileId: string;
  rawCode: string | null | undefined;
}): Promise<void> {
  const code = normalizeReferralCode(input.rawCode);

  if (!code) {
    return;
  }

  try {
    const supabase = createSupabaseServiceClient();

    if (!supabase) {
      return;
    }

    const { data: referrer } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();

    if (!referrer || referrer.id === input.referredProfileId) {
      return;
    }

    // The unique constraint on referred_profile_id makes a second attempt
    // a no-op, so first attribution wins.
    await supabase.from("referrals").insert({
      referrer_profile_id: referrer.id,
      referred_profile_id: input.referredProfileId,
      code,
      source: "link"
    });
  } catch {
    // Attribution is best-effort by design.
  }
}

// Personal referral stats for the cabinet: how many people came by the
// client's link, how many started a case, how many paid. Invitee emails are
// masked — the referrer must not learn who exactly registered.
export async function getReferralSummary(
  profileId: string
): Promise<ReferralSummary> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      status: "unavailable",
      code: null,
      invited: 0,
      started: 0,
      paid: 0,
      invitees: []
    };
  }

  const code = await ensureReferralCode(profileId);

  const { data: rows } = await supabase
    .from("referrals")
    .select("referred_profile_id, created_at")
    .eq("referrer_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(100);

  const referrals = rows ?? [];
  const ids = referrals.map((row) => row.referred_profile_id);

  if (ids.length === 0) {
    return { status: "ready", code, invited: 0, started: 0, paid: 0, invitees: [] };
  }

  const [casesResult, paymentsResult] = await Promise.all([
    supabase.from("client_cases").select("profile_id").in("profile_id", ids),
    supabase
      .from("payments")
      .select("profile_id")
      .eq("status", "paid")
      .in("profile_id", ids)
  ]);

  const withCase = new Set((casesResult.data ?? []).map((row) => row.profile_id));
  const withPayment = new Set(
    (paymentsResult.data ?? []).map((row) => row.profile_id)
  );

  const invitees: ReferralInvitee[] = referrals.map((row) => ({
    createdAt: row.created_at,
    email: null,
    hasCase: withCase.has(row.referred_profile_id),
    hasPaid: withPayment.has(row.referred_profile_id)
  }));

  return {
    status: "ready",
    code,
    invited: referrals.length,
    started: invitees.filter((item) => item.hasCase).length,
    paid: invitees.filter((item) => item.hasPaid).length,
    invitees
  };
}

// Platform-wide referral picture for the founder cabinet.
export async function getReferralOverview(): Promise<{
  totalReferred: number;
  totalPaid: number;
  topReferrers: Array<{ email: string | null; invited: number }>;
}> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { totalReferred: 0, totalPaid: 0, topReferrers: [] };
  }

  const { data: rows } = await supabase
    .from("referrals")
    .select("referrer_profile_id, referred_profile_id, profiles!referrals_referrer_profile_id_fkey(email)")
    .limit(1000);

  const referrals = (rows ?? []) as unknown as Array<{
    referrer_profile_id: string;
    referred_profile_id: string;
    profiles: { email: string | null } | null;
  }>;

  if (referrals.length === 0) {
    return { totalReferred: 0, totalPaid: 0, topReferrers: [] };
  }

  const { data: paidRows } = await supabase
    .from("payments")
    .select("profile_id")
    .eq("status", "paid")
    .in(
      "profile_id",
      referrals.map((row) => row.referred_profile_id)
    );

  const paidSet = new Set((paidRows ?? []).map((row) => row.profile_id));

  const byReferrer = new Map<string, { email: string | null; invited: number }>();

  for (const row of referrals) {
    const entry = byReferrer.get(row.referrer_profile_id) ?? {
      email: row.profiles?.email ?? null,
      invited: 0
    };
    entry.invited += 1;
    byReferrer.set(row.referrer_profile_id, entry);
  }

  return {
    totalReferred: referrals.length,
    totalPaid: referrals.filter((row) => paidSet.has(row.referred_profile_id))
      .length,
    topReferrers: [...byReferrer.values()]
      .sort((a, b) => b.invited - a.invited)
      .slice(0, 5)
  };
}
