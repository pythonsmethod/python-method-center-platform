"use client";

import { useEffect, useRef } from "react";
import { nextHeaderVisibility } from "@/lib/ui/header-visibility";

type SiteHeaderProps = {
  children: React.ReactNode;
};

// The header steps out of the way while someone reads forward, and comes
// back the moment they scroll up.
//
// The class is set straight on the element rather than through React state:
// this runs on every scroll frame, and re-rendering the whole header — with
// the nav and the language switch inside it — to add one class would be
// paid for in dropped frames on the phones that need this most.
export function SiteHeader({ children }: SiteHeaderProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    let lastScrollY = Math.max(0, window.scrollY);
    let hidden = false;
    let queued = false;

    function apply() {
      queued = false;

      const node = ref.current;

      if (!node) {
        return;
      }

      const result = nextHeaderVisibility({
        scrollY: window.scrollY,
        lastScrollY,
        hidden,
        hasFocusInside: node.contains(document.activeElement)
      });

      lastScrollY = result.lastScrollY;

      if (result.hidden !== hidden) {
        hidden = result.hidden;
        node.classList.toggle("site-header--hidden", hidden);
      }
    }

    function onScroll() {
      if (queued) {
        return;
      }

      queued = true;
      window.requestAnimationFrame(apply);
    }

    // Focus can arrive by keyboard while the header is out of sight — from
    // a skip link, or by tabbing backwards. It has to come back for it.
    function onFocusIn() {
      const node = ref.current;

      if (node && hidden && node.contains(document.activeElement)) {
        hidden = false;
        node.classList.remove("site-header--hidden");
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocusIn);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return (
    <header className="site-header" ref={ref}>
      {children}
    </header>
  );
}
