"use client";

import type { ReactNode } from "react";

// The event the companion listens for. Anything on the page can ask Анхам
// to open — the buttons do not need a reference to him, and he does not
// need to know who called.
export const ANHAM_OPEN_EVENT = "anham:open";

// A question can travel with the request to open.
//
// The hardest part of talking to an assistant for the first time is not
// willingness — it is the empty box and not knowing what may be asked. A
// ready question that sends itself removes that, and the conversation
// starts with an answer rather than with a blinking cursor.
export type AnhamOpenDetail = { ask?: string };

export function openAnham(ask?: string): void {
  window.dispatchEvent(
    new CustomEvent<AnhamOpenDetail>(ANHAM_OPEN_EVENT, { detail: { ask } })
  );
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
    <button className={className} onClick={() => openAnham()} type="button">
      {children}
    </button>
  );
}
