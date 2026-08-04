// P1-01: the controlled path that carries a re-submitted questionnaire
// into the case the staff actually reads.
//
// client_cases has no client UPDATE policy on purpose — durable case
// decisions belong to the staff. Under RLS an update without a policy
// silently touches zero rows and raises no error, which is exactly how a
// client's corrected answers were getting lost while the form reported
// success. So this one narrow synchronization runs through the
// service-role client, scoped by an explicit ownership predicate, and
// refuses to pretend: zero updated rows is a failure, not a success.

type CaseSyncClient = {
  from: (table: string) => {
    update: (
      values: { title: string; summary: string },
      options: { count: "exact" }
    ) => {
      eq: (
        column: string,
        value: string
      ) => {
        eq: (
          column: string,
          value: string
        ) => PromiseLike<{ error: { message: string } | null; count: number | null }>;
      };
    };
  };
};

export type CaseSyncResult =
  | { status: "ok" }
  | { status: "error"; message: string };

export async function syncCaseFromOnboarding(
  service: CaseSyncClient | null,
  input: {
    caseId: string;
    profileId: string;
    primaryGoal: string;
    situationDescription: string;
  }
): Promise<CaseSyncResult> {
  if (!service) {
    return {
      status: "error",
      message: "Сервис временно недоступен — попробуйте ещё раз чуть позже."
    };
  }

  const { error, count } = await service
    .from("client_cases")
    .update(
      { title: input.primaryGoal, summary: input.situationDescription },
      { count: "exact" }
    )
    .eq("id", input.caseId)
    .eq("profile_id", input.profileId);

  if (error) {
    return { status: "error", message: error.message };
  }

  // The important half: every future silent no-op on this path becomes a
  // visible error instead of a success message over lost data.
  if (!count) {
    return {
      status: "error",
      message: "Не удалось обновить кейс. Попробуйте ещё раз."
    };
  }

  return { status: "ok" };
}
