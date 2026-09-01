import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Anham · Python Method Center",
    short_name: "Anham",
    description: "Daily longevity companion · Ежедневный проводник по долголетию",
    start_url: "/?tab=anham&lang=ru",
    display: "standalone",
    background_color: "#020403",
    theme_color: "#020403",
    orientation: "portrait",
    icons: [
      {
        src: "/images/anham-master.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
