import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config/site";

// The public face of the platform is welcome in search; the private one is
// not. Everything behind a login and every API stay out of the index — not
// as a security measure (auth does
// that), but so no half-private page ever becomes someone's first
// impression of the center.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/app-preview",
          "/cabinet",
          "/onboarding",
          "/auth/",
          "/site-preview",
          "/welcome",
          "/payment/success",
          // The English side of the two pages that are public but not for
          // search. Everything else under /en is meant to be found.
          "/en/payment/success",
          "/en/shop"
        ]
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
