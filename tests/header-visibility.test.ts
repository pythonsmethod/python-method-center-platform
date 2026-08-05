import { describe, expect, it } from "vitest";
import {
  HEADER_REVEAL_ZONE,
  HEADER_SCROLL_THRESHOLD,
  nextHeaderVisibility
} from "@/lib/ui/header-visibility";

// The header steps aside while someone reads forward.
//
// On a phone it wraps onto more than one row and it is sticky, so it took
// that much off every screen the whole way down a long page — "не видно
// контент когда скролишь".
//
// The rules are here rather than in the scroll handler because each one
// exists to stop a specific way this feature goes wrong, and none of them
// can be checked by reading the handler.

const shown = { hidden: false };
const away = { hidden: true };

describe("scrolling down the page", () => {
  it("puts the header away once the top is out of sight", () => {
    const result = nextHeaderVisibility({
      scrollY: 900,
      lastScrollY: 800,
      ...shown
    });

    expect(result.hidden).toBe(true);
    expect(result.lastScrollY).toBe(900);
  });

  it("keeps it while the top of the page is still near", () => {
    // Near the top there is nothing to gain, and a header that flicks away
    // on the first movement of a finger reads as a fault.
    const result = nextHeaderVisibility({
      scrollY: HEADER_REVEAL_ZONE - 1,
      lastScrollY: 0,
      ...shown
    });

    expect(result.hidden).toBe(false);
  });
});

describe("scrolling back up", () => {
  it("brings it back immediately, wherever on the page", () => {
    const result = nextHeaderVisibility({
      scrollY: 4000,
      lastScrollY: 4100,
      ...away
    });

    expect(result.hidden).toBe(false);
  });

  it("brings it back on reaching the top", () => {
    const result = nextHeaderVisibility({ scrollY: 0, lastScrollY: 3000, ...away });

    expect(result.hidden).toBe(false);
  });
});

describe("movement that is not a decision", () => {
  it("ignores a jitter too small to be intent", () => {
    const result = nextHeaderVisibility({
      scrollY: 1000 + HEADER_SCROLL_THRESHOLD - 1,
      lastScrollY: 1000,
      ...shown
    });

    expect(result.hidden).toBe(false);
  });

  it("does not forget it, so a slow scroll still counts", () => {
    // Small movements accumulate rather than being thrown away: someone
    // scrolling gently a few pixels at a time must not be ignored for ever.
    let state = { hidden: false, lastScrollY: 1000 };

    for (const scrollY of [1003, 1006, 1009]) {
      state = nextHeaderVisibility({ scrollY, ...state });
    }

    expect(state.hidden).toBe(true);
  });

  it("survives the rubber band above the top of an iPhone page", () => {
    const result = nextHeaderVisibility({ scrollY: -80, lastScrollY: 0, ...shown });

    expect(result.hidden).toBe(false);
    expect(result.lastScrollY).toBe(0);
  });
});

describe("what must never be taken off the screen", () => {
  it("keeps a header that holds the keyboard focus", () => {
    // Otherwise tabbing into the navigation scrolls the focused link out of
    // view, and a keyboard user is left typing into something invisible.
    const result = nextHeaderVisibility({
      scrollY: 2000,
      lastScrollY: 1000,
      hidden: false,
      hasFocusInside: true
    });

    expect(result.hidden).toBe(false);
  });

  it("brings a hidden header back when focus lands inside it", () => {
    const result = nextHeaderVisibility({
      scrollY: 2000,
      lastScrollY: 1900,
      hidden: true,
      hasFocusInside: true
    });

    expect(result.hidden).toBe(false);
  });
});
