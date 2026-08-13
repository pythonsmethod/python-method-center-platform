import type { AuthErrorCode } from "@/lib/auth/error-messages";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
  // Set only on failures the form can act on — today that means offering to
  // resend the confirmation email when the account exists but is unconfirmed.
  code?: AuthErrorCode;
};

export const initialAuthActionState: AuthActionState = {
  status: "idle",
  message: ""
};
