// Shapes and initial values for the profile details form.
//
// These live outside the "use server" module on purpose: a file marked
// "use server" may only export async functions. A plain object exported
// from there is not the object by the time it reaches a client component —
// Next.js rejects the module at runtime with E352, and every form that
// module serves stops working.

export type ProfileDetailsActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialProfileDetailsActionState: ProfileDetailsActionState = {
  status: "idle",
  message: ""
};
