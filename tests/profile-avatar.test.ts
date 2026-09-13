import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  avatarPathBelongsTo,
  detectSupportedAvatar,
  MAX_PROFILE_AVATAR_BYTES
} from "@/lib/profile/avatar";

describe("profile avatars", () => {
  it("detects supported image content instead of trusting the filename", () => {
    expect(detectSupportedAvatar(new Uint8Array([0xff, 0xd8, 0xff]))?.mediaType).toBe("image/jpeg");
    expect(detectSupportedAvatar(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mediaType).toBe("image/png");
    expect(detectSupportedAvatar(new TextEncoder().encode("RIFF0000WEBP"))?.mediaType).toBe("image/webp");
    expect(detectSupportedAvatar(new TextEncoder().encode("<svg></svg>"))).toBeNull();
  });

  it("keeps deletion scoped to the authenticated profile folder", () => {
    const owner = "11111111-1111-1111-1111-111111111111";
    expect(avatarPathBelongsTo(owner, `${owner}/photo.jpg`)).toBe(true);
    expect(avatarPathBelongsTo(owner, "22222222-2222-2222-2222-222222222222/photo.jpg")).toBe(false);
    expect(avatarPathBelongsTo(owner, `${owner}/../other/photo.jpg`)).toBe(false);
    expect(MAX_PROFILE_AVATAR_BYTES).toBe(5 * 1024 * 1024);
  });

  it("keeps the bucket private and scopes writes by owner folder", () => {
    const migration = readFileSync(
      "supabase/migrations/20260913070000_client_profile_avatars.sql",
      "utf8"
    ).replace(/\r\n/g, "\n");
    expect(migration).toContain("'profile-avatars',\n  'profile-avatars',\n  false");
    expect(migration).toContain("(storage.foldername(name))[1] = (select auth.uid()::text)");
    expect(migration).toContain("owner_id = (select auth.uid()::text)");
  });
});
