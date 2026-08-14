function publicStoreUrl(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && /^https:\/\//.test(value) ? value : null;
}

export const APP_STORE_URL = publicStoreUrl("NEXT_PUBLIC_APP_STORE_URL");
export const GOOGLE_PLAY_URL = publicStoreUrl("NEXT_PUBLIC_GOOGLE_PLAY_URL");
