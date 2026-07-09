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
  status: string;
  created_at: string;
  updated_at: string;
};

export const STAFF_ASSIGNABLE_SUPPORT_STATUSES = [
  "in_progress",
  "waiting_on_client",
  "resolved",
  "closed"
] as const;

export type StaffAssignableSupportStatus =
  (typeof STAFF_ASSIGNABLE_SUPPORT_STATUSES)[number];
