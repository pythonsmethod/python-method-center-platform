// State shape for the token redemption form.
//
// Kept out of the action module: a file marked with the server directive
// may only export async functions. A plain object exported from there
// arrives in the browser as a server reference rather than the object,
// and the first property read on it breaks the page.

export type RedeemState = {
  status: "idle" | "error" | "success";
  message: string;
  code?: string;
};

export const initialRedeemState: RedeemState = { status: "idle", message: "" };
