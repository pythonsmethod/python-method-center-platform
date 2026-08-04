export type ShopWaitlistActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialShopWaitlistState: ShopWaitlistActionState = {
  status: "idle",
  message: ""
};
