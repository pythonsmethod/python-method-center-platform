// Which hosts one language choice should cover.
//
// Kept out of the "use server" module on purpose: such a file may export
// only async functions, and a synchronous export there fails at runtime
// where neither TypeScript nor the build can see it.
//
// Never widen onto a public suffix — a browser silently drops such a cookie
// and the language would appear not to switch, which is the very bug this
// exists to fix.
export function localeCookieDomain(host: string): string | undefined {
  const name = host.split(":")[0].toLowerCase();

  if (!name || name === "localhost" || /^[\d.]+$/.test(name)) {
    return undefined;
  }

  if (name.startsWith("www.")) {
    return name.slice(4);
  }

  // Exactly two labels is an apex domain we own: setting it covers www too.
  // Anything longer — a preview deployment, a subdomain — stays host-scoped.
  return name.split(".").length === 2 ? name : undefined;
}
