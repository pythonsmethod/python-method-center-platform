export function isCronAuthorized(
  authorization: string | null,
  configuredSecret = process.env.CRON_SECRET
): boolean {
  const secret = configuredSecret?.trim();
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

export function summarizeMaintenance(input: {
  documents: number;
  outcomes: Record<string, number>;
  expiredPeriods: number;
  lifecycleEvents: number;
  casesAligned: number;
  durationMs: number;
  reachedLimit: boolean;
}) {
  const retriedCount = input.outcomes.retrying ?? 0;
  const failedCount =
    (input.outcomes.failed ?? 0) + (input.outcomes.needs_reupload ?? 0);
  const complete = !input.reachedLimit;

  return {
    processedCount: input.documents - failedCount,
    failedCount,
    retriedCount,
    expiredPeriodsCount: input.expiredPeriods,
    lifecycleEventsCount: input.lifecycleEvents,
    casesAlignedCount: input.casesAligned,
    durationMs: input.durationMs,
    truncated: !complete,
    complete,
    outcomes: input.outcomes
  };
}
