"use client";

import type { ReactNode } from "react";

// The event the companion listens for. Anything on the page can ask Анхам
// to open — the buttons do not need a reference to him, and he does not
// need to know who called.
export const ANHAM_OPEN_EVENT = "anham:open";

export function openAnham(): void {
  window.dispatchEvent(new Event(ANHAM_OPEN_EVENT));
}

type AnhamOpenButtonProps = {
  className?: string;
  children: ReactNode;
};

// A button that opens Анхам's panel where the visitor already is, instead
// of navigating them away to the support page.
export function AnhamOpenButton({
  className,
  children
}: AnhamOpenButtonProps) {
  return (
    <button className={className} onClick={openAnham} type="button">
      {children}
    </button>
  );
}
