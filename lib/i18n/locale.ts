import { cookies } from "next/headers";

export type Locale = "ru" | "en";

export const LOCALE_COOKIE = "pm-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "ru" || value === "en";
}

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;

  return isLocale(value) ? value : "ru";
}
