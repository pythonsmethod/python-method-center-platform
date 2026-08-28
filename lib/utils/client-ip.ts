// Which address a rate limit is counted against.
//
// It used to be the first entry of x-forwarded-for. That header is a list a
// request carries with it, and its first entry is whatever the caller put
// there: sending a fresh value on every request lands each one in its own
// bucket. That matters more than a per-minute burst, because the same
// address is hashed into the daily counter in the database — the cap that
// actually limits what the free assistant can cost in a day.
//
// x-real-ip is written by the platform, never carried in from outside, so
// it is preferred. Where it is absent the last entry of x-forwarded-for is
// the one appended by the nearest proxy rather than the one supplied by the
// caller, so it is the safer end of the list to read.
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();

  if (real) {
    return real;
  }

  const forwarded = headers.get("x-forwarded-for");

  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);

    const nearest = hops[hops.length - 1];

    if (nearest) {
      return nearest;
    }
  }

  return "unknown";
}
