"use server";

import { revalidatePath } from "next/cache";
import type { ProfileAvatarActionState, ProfileDetailsActionState } from "@/lib/profile/action-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/locale";
import { isFullName } from "@/lib/profile/identity";
import sharp from "sharp";
import {
  avatarPathBelongsTo,
  detectSupportedAvatar,
  MAX_PROFILE_AVATAR_BYTES,
  PROFILE_AVATAR_BUCKET
} from "@/lib/profile/avatar";



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

function cleanTimeZone(value: FormDataEntryValue | null): string {
  const candidate = typeof value === "string" ? value.trim().slice(0, 64) : "";
  try {
    new Intl.DateTimeFormat("en", { timeZone: candidate }).format();
    return candidate;
  } catch {
    return "America/Los_Angeles";
  }
}

// The client edits their own row under their own session: RLS allows only
// their profile, and the database trigger keeps role/status out of reach —
// so this action needs no service key and cannot touch anyone else.
export async function updateProfileDetails(
  _previousState: ProfileDetailsActionState,
  formData: FormData
): Promise<ProfileDetailsActionState> {
  const locale = await getLocale();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return errorState(locale === "ru" ? "Сессия истекла — войдите заново." : "Your session expired. Please sign in again.");
  }

  const fullName = cleanField(formData.get("full_name"), 160);

  if (!fullName || !isFullName(fullName)) {
    return errorState(
      locale === "ru"
        ? "Укажите имя и фамилию полностью."
        : "Please enter both first and last name."
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: cleanField(formData.get("phone"), 40),
      time_zone: cleanTimeZone(formData.get("time_zone"))
    })
    .eq("id", user.id);

  if (error) {
    // The column may not exist until the owner runs the migration; the
    // person should read a human sentence, not a database error.
    return errorState(
      locale === "ru"
        ? "Не удалось сохранить данные. Попробуйте ещё раз — а если повторится, напишите в поддержку."
        : "Could not save your details. Try again, and contact support if it happens again."
    );
  }

  // Without this the row is updated and the page is not: the person sees
  // the form exactly as they left it, comes back later to an empty address
  // field, and reasonably concludes nothing was saved. Every other action
  // in this codebase revalidates; this one was missed.
  revalidatePath("/cabinet/account");
  // The cabinet greets the person by the name held on this row.
  revalidatePath("/cabinet");

  return { status: "success", message: locale === "ru" ? "Данные сохранены." : "Details saved." };
}

export async function uploadProfileAvatar(
  _previousState: ProfileAvatarActionState,
  formData: FormData
): Promise<ProfileAvatarActionState> {
  const locale = await getLocale();
  const error = (ru: string, en: string): ProfileAvatarActionState => ({
    status: "error",
    message: locale === "ru" ? ru : en
  });
  const supabase = await createSupabaseServerClient();

  if (!supabase) return error("Сервис временно недоступен.", "The service is temporarily unavailable.");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return error("Сессия истекла — войдите заново.", "Your session expired. Please sign in again.");

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return error("Выберите фотографию.", "Choose a photo.");
  }
  if (file.size > MAX_PROFILE_AVATAR_BYTES) {
    return error("Фотография должна быть не больше 5 МБ.", "The photo must be 5 MB or smaller.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectSupportedAvatar(bytes);
  if (!detected) {
    return error("Поддерживаются только фотографии JPEG, PNG и WebP.", "Only JPEG, PNG, and WebP photos are supported.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  let normalizedPhoto: Buffer;
  try {
    // Re-encoding validates the complete image, removes EXIF/location metadata,
    // and prevents a large original from being served as an avatar.
    normalizedPhoto = await sharp(bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(512, 512, { fit: "cover", position: "attention" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    return error("Файл повреждён или не является фотографией.", "The file is damaged or is not a photo.");
  }

  const path = `${user.id}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(path, normalizedPhoto, { contentType: "image/jpeg", upsert: false });

  if (uploadError) {
    return error("Не удалось загрузить фотографию. Попробуйте ещё раз.", "The photo could not be uploaded. Please try again.");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", user.id);

  if (updateError) {
    await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([path]);
    return error("Не удалось сохранить фотографию. Попробуйте ещё раз.", "The photo could not be saved. Please try again.");
  }

  const previousPath = typeof profile?.avatar_path === "string" ? profile.avatar_path : null;
  if (previousPath && previousPath !== path && avatarPathBelongsTo(user.id, previousPath)) {
    await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([previousPath]);
  }

  revalidatePath("/cabinet", "layout");
  revalidatePath("/cabinet/account");

  return {
    status: "success",
    message: locale === "ru" ? "Фотография обновлена." : "Photo updated."
  };
}
