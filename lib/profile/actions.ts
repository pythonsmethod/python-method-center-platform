"use server";

import type { ProfileDetailsActionState } from "@/lib/profile/action-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";



function errorState(message: string): ProfileDetailsActionState {
  return { status: "error", message };
}

function cleanField(value: FormDataEntryValue | null, max: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value.trim().replace(/\s+/g, " ");

  return clean.length > 0 ? clean.slice(0, max) : null;
}

// The address keeps its line breaks — people write addresses in lines.
function cleanAddress(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value
    .split("\n")
    .map((line) => line.trim().replace(/[ \t]+/g, " "))
    .filter(Boolean)
    .join("\n");

  return clean.length > 0 ? clean.slice(0, 600) : null;
}

// The client edits their own row under their own session: RLS allows only
// their profile, and the database trigger keeps role/status out of reach —
// so this action needs no service key and cannot touch anyone else.
export async function updateProfileDetails(
  _previousState: ProfileDetailsActionState,
  formData: FormData
): Promise<ProfileDetailsActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return errorState("Сессия истекла — войдите заново.");
  }

  const fullName = cleanField(formData.get("full_name"), 160);

  if (!fullName) {
    return errorState("Укажите имя — команде нужно знать, как к вам обращаться.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: cleanField(formData.get("phone"), 40),
      delivery_address: cleanAddress(formData.get("delivery_address"))
    })
    .eq("id", user.id);

  if (error) {
    // The column may not exist until the owner runs the migration; the
    // person should read a human sentence, not a database error.
    return errorState(
      "Не удалось сохранить данные. Попробуйте ещё раз — а если повторится, напишите в поддержку."
    );
  }

  return { status: "success", message: "Данные сохранены." };
}
