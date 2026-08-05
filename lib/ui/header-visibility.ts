// Should the header be showing right now?
//
// On a phone the header wraps onto several rows and takes a real bite out
// of the screen, and it is sticky — so it took that bite the whole way down
// a long page. It now steps out of the way when someone is reading forward
// and comes back the moment they scroll back up.
//
// Kept as a pure function so the rules can be tested without a browser.
// They are small and every one of them exists because the obvious version
// gets something wrong.

// Nothing hides while the top of the page is still in sight: near the top
// there is nothing to gain, and a header that flickers away on the first
// flick of a finger reads as a fault.
export const HEADER_REVEAL_ZONE = 120;

// Below this, a scroll is a thumb resting or a rubber-band bounce, not an
// intention. Movement under it accumulates rather than being thrown away,
// so a slow deliberate scroll still counts.
export const HEADER_SCROLL_THRESHOLD = 8;

export type HeaderVisibilityInput = {
  scrollY: number;
  lastScrollY: number;
  hidden: boolean;
  // A header holding the keyboard focus must never leave: it would take the
  // focused control off the screen with it.
  hasFocusInside?: boolean;
};

export type HeaderVisibilityResult = {
  hidden: boolean;
  // What the caller should remember as the previous position. Movement too
  // small to act on is not remembered, so it can add up.
  lastScrollY: number;
};

export function nextHeaderVisibility(
  input: HeaderVisibilityInput
): HeaderVisibilityResult {
  const { scrollY, lastScrollY, hidden, hasFocusInside = false } = input;

  // A negative position is iOS rubber-banding above the top of the page.
  const position = Math.max(0, scrollY);

  if (hasFocusInside) {
    return { hidden: false, lastScrollY: position };
  }

  if (position <= HEADER_REVEAL_ZONE) {
    return { hidden: false, lastScrollY: position };
  }

  const delta = position - lastScrollY;

  if (Math.abs(delta) < HEADER_SCROLL_THRESHOLD) {
    return { hidden, lastScrollY };
  }

  return { hidden: delta > 0, lastScrollY: position };
}
