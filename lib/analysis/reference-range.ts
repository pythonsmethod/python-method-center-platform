// The reference interval printed on the form, read as two numbers.
//
// This is the fingerprint of the unit. A haemoglobin of 9.6 is a mild
// anaemia beside "12–15.5" and an impossibility beside "120–155": the
// number alone cannot say which, and guessing is the one thing that must
// never happen here. So the interval is parsed and the unit follows from
// it, the way the scale printed on a ruler says whether it measures
// centimetres or inches.
//
// Nothing in this file interprets anything about a person. It reads two
// numbers off a piece of paper.

export type ReferenceRange = {
  // Either bound may be absent: "< 5.0" and "> 40" are ordinary ways to
  // print a limit, and half an interval is still worth having.
  low: number | null;
  high: number | null;
};

// Laboratories print the decimal separator both ways, often in the same
// document, and the dash comes in four shapes.
const DASHES = /[–—−]/g;

function toNumber(raw: string): number | null {
  const cleaned = raw.replace(",", ".").trim();

  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }

  const value = Number(cleaned);

  return Number.isFinite(value) ? value : null;
}

// Strips what surrounds the numbers: the unit, a trailing asterisk, the
// word "норма". What it must not strip is a minus that means "to", which
// is why the dashes are normalised to a plain hyphen first.
function normalise(text: string): string {
  return text
    .replace(DASHES, "-")
    .replace(/ /g, " ")
    .trim();
}

export function parseReferenceRange(text: string | null | undefined): ReferenceRange | null {
  if (!text) {
    return null;
  }

  const source = normalise(text);

  // A dash written by a laboratory to mean "no interval printed" — and the
  // same character it uses between two bounds. Length settles it.
  if (source.length <= 2) {
    return null;
  }

  // "12 - 15.5", "120-155", "0,0 - 0,3". The bounds are taken as the first
  // two numbers joined by a hyphen, so a trailing unit is ignored.
  const pair = source.match(/(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)/);

  if (pair) {
    const low = toNumber(pair[1]);
    const high = toNumber(pair[2]);

    if (low === null || high === null) {
      return null;
    }

    // A form that prints "15.5 - 12" has been misread, not misprinted.
    // Accepting it would invert the interval and put every value outside.
    if (low > high) {
      return null;
    }

    return { low, high };
  }

  // One-sided limits. "менее"/"до"/"less than" carry the same meaning as
  // the symbol and appear just as often.
  const upper = source.match(/^(?:<|≤|до|менее|less than|up to)\s*(\d+(?:[.,]\d+)?)/i);

  if (upper) {
    const high = toNumber(upper[1]);

    return high === null ? null : { low: null, high };
  }

  const lower = source.match(/^(?:>|≥|от|более|greater than|over)\s*(\d+(?:[.,]\d+)?)/i);

  if (lower) {
    const low = toNumber(lower[1]);

    return low === null ? null : { low, high: null };
  }

  return null;
}

// Where a value sits inside its own laboratory's interval: 0 at the lower
// bound, 1 at the upper, below 0 or above 1 outside it.
//
// This is the only quantity comparable between countries. Two ferritins of
// 43 are the same number and different states — one at the floor of a
// 30–400 interval, the other mid-range in a 10–120 one. Comparing the
// numbers says nothing; comparing the positions says what changed.
export function positionInReference(
  value: number,
  range: ReferenceRange | null
): number | null {
  if (!range || range.low === null || range.high === null) {
    return null;
  }

  const span = range.high - range.low;

  // A degenerate interval has no inside. Dividing by it would report
  // infinity as a position, which is worse than reporting nothing.
  if (span <= 0) {
    return null;
  }

  return (value - range.low) / span;
}

// Whether two readings of the same form found the same interval.
//
// The interval decides the unit, so a disagreement here is not a small
// discrepancy: it is the difference between grams per litre and grams per
// decilitre, a factor of ten in what the value means. An interval the two
// readings did not agree on is not used to resolve anything.
export function referenceRangesMatch(
  first: string | null | undefined,
  second: string | null | undefined
): boolean {
  const a = parseReferenceRange(first);
  const b = parseReferenceRange(second);

  if (!a || !b) {
    // Both absent is agreement that nothing was printed. One present and
    // one absent is a disagreement about whether it was.
    return !a && !b;
  }

  return a.low === b.low && a.high === b.high;
}
