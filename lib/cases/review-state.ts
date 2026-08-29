// Shapes and initial values for the case-review panel.
//
// Outside the "use server" module on purpose: a file marked "use server"
// may export only async functions, and a plain object exported from there
// takes every form it serves down with it at runtime (E352).

export type CaseReview = {
  id: string;
  summary: string;
  draft: string;
  documentsFingerprint: string;
  documentsCount: number;
  createdAt: string;
  // False when the client has uploaded or removed something since this
  // reading was made.
  isCurrent: boolean;
  approvedText: string | null;
  approvedAt: string | null;
  approvalCount: number;
};

export type CaseReviewActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialCaseReviewState: CaseReviewActionState = {
  status: "idle",
  message: ""
};
