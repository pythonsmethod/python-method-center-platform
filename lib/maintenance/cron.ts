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
  maintenanceError?: string | null;
}) {
  const retriedCount = input.outcomes.retrying ?? 0;
  const failedCount = input.outcomes.failed ?? 0;
  const needsReuploadCount = input.outcomes.needs_reupload ?? 0;
  const completedCount = input.outcomes.ready ?? 0;
  const classifiedCount =
    completedCount + retriedCount + failedCount + needsReuploadCount;
  const otherOutcomeCount = Math.max(0, input.documents - classifiedCount);
  const complete = !input.reachedLimit && !input.maintenanceError;

  return {
    documentsAttemptedCount: input.documents,
    completedCount,
    failedCount,
    retriedCount,
    needsReuploadCount,
    otherOutcomeCount,
    expiredPeriodsCount: input.expiredPeriods,
    lifecycleEventsCount: input.lifecycleEvents,
    casesAlignedCount: input.casesAligned,
    durationMs: input.durationMs,
    truncated: input.reachedLimit,
    complete,
    maintenanceError: input.maintenanceError ?? null,
    outcomes: input.outcomes
  };
}

export function sanitizedMaintenanceError(error: unknown): string {
  if (!(error instanceof Error)) return "operational-maintenance-failed";
  return error.message
    .replace(/Bearer\s+\S+|(?:secret|key|token)\s*[=:]\s*\S+/gi, "[redacted]")
    .slice(0, 240);
}
