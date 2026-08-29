import type { MetadataRoute } from "next";
import { getLocale } from "@/lib/i18n/locale";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = await getLocale();

  return {
    id: "/welcome",
    name: "Python Method Center",
    short_name: "Python Method",
    description: locale === "ru"
      ? "Персональный центр сопровождения восстановления"
      : "Personal recovery support center",
    start_url: "/welcome",
    scope: "/",
    lang: locale,
    display: "standalone",
    background_color: "#100d08",
    theme_color: "#100d08",
    orientation: "portrait",
    categories: ["health", "lifestyle"],
    // Chrome wants 192 and 512 before it offers to install, and Android
    // crops a plain icon to a circle — hence the maskable variant, which
    // keeps the artwork inside the safe area on the brand-coloured plate.
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
