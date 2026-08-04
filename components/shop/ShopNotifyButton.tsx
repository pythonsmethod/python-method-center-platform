"use client";

import { requestShopWaitlist } from "@/components/shop/ShopWaitlist";

// Sits on a product card. Carries the product with it, so the person does
// not have to find their item again in a dropdown at the foot of the page.
export function ShopNotifyButton({
  itemId,
  label
}: {
  itemId: string;
  label: string;
}) {
  return (
    <button
      className="button button--secondary shop-card__notify"
      onClick={() => requestShopWaitlist(itemId)}
      type="button"
    >
      {label}
    </button>
  );
}
