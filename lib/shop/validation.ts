import { isShopItemId, type ShopItemId } from "@/lib/shop/catalog";

// Pure validation for the shop's waiting list (unit-tested).
//
// The form asks for as little as it can: an email to write to, and a tick
// saying we may write to it. A waiting list that demands a name and a
// phone number before a product even exists is a list nobody joins.

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ShopWaitlistInput = {
  email: string;
  itemId: string;
  consent: boolean;
  honeypot: string;
};

export type ShopWaitlistValidated = {
  email: string;
  // Null means the line as a whole rather than one product.
  itemId: ShopItemId | null;
};

export type ShopWaitlistMessages = {
  invalidEmail: string;
  consentRequired: string;
  generic: string;
};

export function validateShopWaitlistInput(
  input: ShopWaitlistInput,
  messages: ShopWaitlistMessages
): { error: string } | ShopWaitlistValidated {
  if (input.honeypot.trim() !== "") {
    return { error: messages.generic };
  }

  const email = input.email.trim();

  if (!email || email.length > 320 || !emailPattern.test(email)) {
    return { error: messages.invalidEmail };
  }

  if (!input.consent) {
    return { error: messages.consentRequired };
  }

  const itemId = input.itemId.trim();

  // An unknown identifier is not worth refusing the person over — it can
  // only come from a stale page or a hand-made request. The interest is
  // real either way; it is filed against the line as a whole.
  return {
    email,
    itemId: isShopItemId(itemId) ? itemId : null
  };
}
