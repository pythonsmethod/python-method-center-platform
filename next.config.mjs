// The part of a Content-Security-Policy that can be turned on today without
// a nonce rollout. It leaves script-src and style-src alone deliberately:
// Next inlines its own hydration script and the home page inlines JSON-LD,
// so locking those down needs per-request nonces threaded through the app —
// separate work, and not something to switch on blind.
//
// What is here still closes real doors: nothing may embed the site, inject a
// <base> to redirect every relative link, load a plugin, or post one of the
// forms to somebody else's server. The site loads no external script, style,
// iframe or embed of its own, so none of this can cost a feature.
const contentSecurityPolicy = [
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests"
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(self)"
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // "X-Powered-By: Next.js" told every visitor which framework and, by
  // implication, which class of advisories to try. It buys nothing.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;
