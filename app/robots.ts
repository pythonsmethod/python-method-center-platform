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
          // The English side of the one page that is public but not for
          // search. /shop is not here in either language on purpose: it
          // carries a noindex tag instead, and a crawler barred from
          // fetching the page can never read the tag telling it to stay
          // away. Everything else under /en is meant to be found.
          "/en/payment/success"
        ]
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
