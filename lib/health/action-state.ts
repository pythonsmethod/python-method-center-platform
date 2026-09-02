// Shapes and initial values for the health questionnaire form.
//
// These live outside the "use server" module on purpose: a file marked
// "use server" may only export async functions. A plain object exported
// from there is not the object by the time it reaches a client component —
// Next.js rejects the module at runtime with E352, and every form that
// module serves stops working.

import type { RequiredField } from "@/lib/health/questionnaire";

export type QuestionnaireActionState = {
  status: "idle" | "success" | "error";
  message: string;
  // Which fields the person still has to fill, so the form can point at
  // them instead of only saying that something is wrong.
  missing: RequiredField[];
};

export const initialQuestionnaireActionState: QuestionnaireActionState = {
  status: "idle",
  message: "",
  missing: []
};
