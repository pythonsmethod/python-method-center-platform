import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config/site";
import { alternatesFor } from "@/lib/i18n/routing";

// Every page a stranger may land on, in the order we would want them to.
// Pages behind a login are not listed — robots.ts keeps crawlers out of
// them entirely.
const PUBLIC_PATHS: { path: string; priority: number; lastModified: string }[] = [
  { path: "/", priority: 1, lastModified: "2026-08-22" },
  { path: "/review", priority: 0.9, lastModified: "2026-08-22" },
  { path: "/professor", priority: 0.8, lastModified: "2026-08-22" },
  { path: "/payment", priority: 0.9, lastModified: "2026-08-22" },
  // /shop is deliberately absent: it asks search engines not to index it
  // while the line has nothing for sale, and a sitemap entry for a
  // noindex page is a contradiction. It goes back in with the first
  // product that can actually be bought.
  { path: "/payment/other", priority: 0.5, lastModified: "2026-08-22" },
  { path: "/support", priority: 0.5, lastModified: "2026-08-22" },
  { path: "/legal/offer", priority: 0.3, lastModified: "2026-08-22" },
  { path: "/legal/privacy", priority: 0.3, lastModified: "2026-08-22" },
  { path: "/legal/refund", priority: 0.3, lastModified: "2026-08-22" }
];

// Both addresses of every page, each naming the other. Listing only the
// Russian ones would leave the English side to be discovered by luck: the
// language used to live in a cookie, and a crawler carries none.
export default function sitemap(): MetadataRoute.Sitemap {
  const absolute = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

  return PUBLIC_PATHS.flatMap(({ path, priority, lastModified }) => {
    const pair = alternatesFor(path);
    const languages = pair
      ? { ru: absolute(pair.ru), en: absolute(pair.en) }
      : undefined;
    const entry = {
      changeFrequency: "weekly" as const,
      priority,
      lastModified: new Date(`${lastModified}T00:00:00.000Z`),
      ...(languages ? { alternates: { languages } } : {})
    };

    if (!pair) {
      return [{ url: absolute(path), ...entry }];
    }

    return [
      { url: absolute(pair.ru), ...entry },
      // The English twin is worth a little less on its own: the Russian
      // address is the one the site has always published.
      { url: absolute(pair.en), ...entry, priority: Math.max(priority - 0.1, 0.1) }
    ];
  });
}
