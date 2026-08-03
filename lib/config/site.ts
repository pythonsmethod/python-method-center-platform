// The one public address of the platform. Everything that tells the outside
// world where we live — canonical URLs, the sitemap, robots.txt, Open Graph
// — derives from this single value, so search engines never see two
// competing addresses for the same page.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
  "https://pythonmethodcenter.com";
