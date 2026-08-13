import { createSupabaseServiceClient } from "@/lib/supabase/service";

// A person who has just typed their email, phone and password twice has
// done everything the centre asks of them. Sending them away to hunt for a
// letter — one that Supabase's built-in mailer delivers late, into spam, or
// not at all — loses people at the only moment they are certain.
//
// So the email address is marked confirmed for them and they walk straight
// into the cabinet. The consequence is stated plainly: the address is not
// verified. Whoever registers may have typed someone else's email. The
// centre reaches its clients by the phone number collected on the same
// form and by talking to them, not by proving an inbox.
//
// This makes the "Confirm email" switch in the Supabase dashboard inert for
// new sign-ups. Undo it here, not there.
export async function confirmNewUserEmail(userId: string): Promise<boolean> {
  try {
    const service = createSupabaseServiceClient();

    if (!service) {
      return false;
    }

    const { error } = await service.auth.admin.updateUserById(userId, {
      email_confirm: true
    });

    return !error;
  } catch {
    // Falls back to the emailed link: the sign-up form keeps its "check
    // your post" message for exactly this case.
    return false;
  }
}
