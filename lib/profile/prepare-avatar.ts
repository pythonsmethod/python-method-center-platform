"use client";

import {
  MAX_PROFILE_AVATAR_BYTES,
  MAX_PROFILE_AVATAR_SOURCE_BYTES,
  PROFILE_AVATAR_MAX_DIMENSION
} from "@/lib/profile/avatar-constraints";

export type PrepareAvatarResult =
  | { status: "ready"; file: File }
  | { status: "too-large" }
  | { status: "unsupported" };

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Decode in the browser before upload. On iPhone this intentionally uses
// Safari's native HEIC/HEIF decoder, preserves the displayed EXIF orientation,
// and sends only a small metadata-free JPEG to the Server Action.
export async function prepareAvatarUpload(file: File): Promise<PrepareAvatarResult> {
  if (file.size === 0 || file.size > MAX_PROFILE_AVATAR_SOURCE_BYTES) {
    return { status: "too-large" };
  }

  try {
    const image = await loadImage(file);
    if (!image.naturalWidth || !image.naturalHeight) return { status: "unsupported" };

    const scale = Math.min(
      1,
      PROFILE_AVATAR_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return { status: "unsupported" };

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.86, 0.76, 0.66]) {
      const blob = await canvasBlob(canvas, quality);
      if (blob && blob.size <= MAX_PROFILE_AVATAR_BYTES) {
        return {
          status: "ready",
          file: new File([blob], "profile-avatar.jpg", {
            type: "image/jpeg",
            lastModified: Date.now()
          })
        };
      }
    }
  } catch {
    // Decode failures are expected for corrupt files and for HEIC on browsers
    // without a native decoder. Keep the account page usable.
  }

  return { status: "unsupported" };
}

