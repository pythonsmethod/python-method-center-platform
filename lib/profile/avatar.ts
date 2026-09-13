import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const PROFILE_AVATAR_BUCKET = "profile-avatars";
export const MAX_PROFILE_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_URL_TTL_SECONDS = 60 * 60;

export type SupportedAvatar = {
  extension: "jpg" | "png" | "webp";
  mediaType: "image/jpeg" | "image/png" | "image/webp";
};

export function detectSupportedAvatar(bytes: Uint8Array): SupportedAvatar | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: "jpg", mediaType: "image/jpeg" };
  }

  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return { extension: "png", mediaType: "image/png" };
  }

  if (bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    return { extension: "webp", mediaType: "image/webp" };
  }

  return null;
}

export function avatarPathBelongsTo(profileId: string, path: string): boolean {
  return path.startsWith(`${profileId}/`) && !path.includes("..") && !path.includes("\\");
}

export async function createProfileAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_URL_TTL_SECONDS);

  return error ? null : data.signedUrl;
}

export async function createProfileAvatarUrlMap(
  paths: Array<string | null | undefined>
): Promise<Record<string, string>> {
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (uniquePaths.length === 0) return {};

  const supabase = createSupabaseServiceClient();
  if (!supabase) return {};

  const { data, error } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .createSignedUrls(uniquePaths, AVATAR_URL_TTL_SECONDS);
  if (error || !data) return {};

  return Object.fromEntries(
    data.flatMap((entry) => entry.signedUrl ? [[entry.path, entry.signedUrl]] : [])
  );
}
