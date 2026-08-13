import { createSupabaseServiceClient } from "@/lib/supabase/service";

// The profile row used to appear only when someone finished the
// questionnaire. Until then a person existed in Supabase Auth and nowhere
// else: no name, no phone, nothing the team could act on — and the whole
// focus group sits exactly in that gap, registered and unreachable.
//
// Registration writes the row itself now. Written with the service key
// because at this moment there may be no session at all: with email
// confirmation switched on, sign-up returns a user and no session, and an
// anonymous client would be refused by RLS.
//
// Best-effort on purpose: nobody is refused an account because the profile
// row could not be written.
export async function createRegistrationProfile(input: {
  userId: string;
  email: string;
  phone: string;
  locale: string;
}): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();

    if (!supabase) {
      return;
    }

    // role and status are left to their defaults ("client", "registered") —
    // naming them here would let a registration form set staff fields.
    await supabase.from("profiles").upsert(
      {
        id: input.userId,
        email: input.email,
        phone: input.phone,
        locale: input.locale
      },
      { onConflict: "id" }
    );
  } catch {
    // Deliberately silent: see above.
  }
}
