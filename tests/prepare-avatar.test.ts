import { File as NodeFile } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_PROFILE_AVATAR_SOURCE_BYTES } from "@/lib/profile/avatar-constraints";
import { prepareAvatarUpload } from "@/lib/profile/prepare-avatar";

afterEach(() => vi.unstubAllGlobals());

describe("avatar browser preparation", () => {
  it("rejects oversized source files before decoding", async () => {
    const file = { size: MAX_PROFILE_AVATAR_SOURCE_BYTES + 1 } as File;
    await expect(prepareAvatarUpload(file)).resolves.toEqual({ status: "too-large" });
  });

  it("converts a browser-decodable photo to a bounded JPEG", async () => {
    class TestImage {
      decoding = "auto";
      src = "";
      naturalWidth = 4_032;
      naturalHeight = 3_024;
      decode = vi.fn().mockResolvedValue(undefined);
    }
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toBlob: (callback: BlobCallback) => callback(new Blob([new Uint8Array(64)], { type: "image/jpeg" }))
    };

    vi.stubGlobal("File", NodeFile);
    vi.stubGlobal("Image", TestImage);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: vi.fn()
    });
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });

    const result = await prepareAvatarUpload(
      new NodeFile([new Uint8Array(128)], "iphone.heic", { type: "image/heic" }) as unknown as File
    );

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.file.type).toBe("image/jpeg");
      expect(result.file.size).toBe(64);
    }
    expect(canvas.width).toBe(1_024);
    expect(canvas.height).toBe(768);
    expect(drawImage).toHaveBeenCalledOnce();
  });

  it("returns a form-safe error when the browser cannot decode the image", async () => {
    class BrokenImage {
      decoding = "auto";
      src = "";
      decode = vi.fn().mockRejectedValue(new Error("decode failed"));
    }
    vi.stubGlobal("Image", BrokenImage);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:broken"),
      revokeObjectURL: vi.fn()
    });

    const file = { size: 128 } as File;
    await expect(prepareAvatarUpload(file)).resolves.toEqual({ status: "unsupported" });
  });
});
