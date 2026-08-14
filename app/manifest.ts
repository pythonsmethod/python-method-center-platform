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
    icons: [
      {
        src: "/images/anham-master.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}
