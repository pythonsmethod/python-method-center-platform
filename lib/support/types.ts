export type SupportRequestActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const initialSupportRequestActionState: SupportRequestActionState = {
  status: "idle",
  message: ""
};

export type ClientSupportRequest = {
  id: string;
  subject: string;
  body: string | null;
  created_at: string;
  updated_at: string;
  messages: SupportRequestMessage[];
};

export type SupportRequestMessage = {
  id: string;
  sender_role: string;
  body: string;
  created_at: string;
};
