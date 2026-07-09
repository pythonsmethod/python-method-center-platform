export type StaffActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const initialStaffActionState: StaffActionState = {
  status: "idle",
  message: ""
};
