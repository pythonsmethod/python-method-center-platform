import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config/site";

// Every page a stranger may land on, in the order we would want them to.
// Pages behind a login are not listed — robots.ts keeps crawlers out of
// them entirely.
const PUBLIC_PATHS: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/review", priority: 0.9 },
  { path: "/professor", priority: 0.8 },
  { path: "/payment", priority: 0.9 },
  // /shop is deliberately absent: it asks search engines not to index it
  // while the line has nothing for sale, and a sitemap entry for a
  // noindex page is a contradiction. It goes back in with the first
  // product that can actually be bought.
  { path: "/payment/other", priority: 0.5 },
  { path: "/support", priority: 0.5 },
  { path: "/legal/offer", priority: 0.3 },
  { path: "/legal/privacy", priority: 0.3 },
  { path: "/legal/refund", priority: 0.3 }
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map(({ path, priority }) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    changeFrequency: "weekly",
    priority
  }));
}
