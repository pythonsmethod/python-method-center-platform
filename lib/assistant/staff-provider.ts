import { isAssistantProvider, type AssistantProvider } from "@/lib/assistant/router";

// Who is allowed to know which model answered.
//
// The founder's rule: clients and Professor Python simply use the
// assistant. Which model replied, and which of two replies an arbiter
// judged stronger, is her view of the machinery and nobody else's — a
// person choosing between vendors starts trusting the answer for the wrong
// reason, and a client who learns the name starts asking for it.
//
// This is decided on the server, not in the browser. Hiding the selector
// would be decoration: the request still carries whatever `provider` the
// caller puts in it.
export const STAFF_DEFAULT_PROVIDER: AssistantProvider = "best";

export type StaffAssistantView = {
  provider: AssistantProvider;
  attribution: boolean;
};

export function staffAssistantView(
  canSeeProviders: boolean,
  requested: unknown
): StaffAssistantView {
  if (!canSeeProviders) {
    // Not a downgrade: this is the same mode the team's chat has always
    // defaulted to — both models answer, an arbiter picks. Only the name of
    // the winner disappears.
    return { provider: STAFF_DEFAULT_PROVIDER, attribution: false };
  }

  const provider = isAssistantProvider(requested)
    ? requested
    : STAFF_DEFAULT_PROVIDER;

  // "both" prints the two answers under their own headings, so it is its own
  // attribution; adding a winner line on top of it would be nonsense.
  return { provider, attribution: provider === "best" };
}
