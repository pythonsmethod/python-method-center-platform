import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config/site";

// Every page a stranger may land on, in the order we would want them to.
// Pages behind a login are not listed — robots.ts keeps crawlers out of
// them entirely.
const PUBLIC_PATHS: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/path", priority: 0.9 },
  { path: "/payment", priority: 0.9 },
  { path: "/shop", priority: 0.7 },
  { path: "/payment/other", priority: 0.5 },
  { path: "/support", priority: 0.5 },
  { path: "/legal/offer", priority: 0.3 },
  { path: "/login", priority: 0.3 }
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map(({ path, priority }) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    changeFrequency: "weekly",
    priority
  }));
}
