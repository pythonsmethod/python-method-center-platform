export type ReprocessingStep =
  | "idle"
  | "continued"
  | "ready"
  | "retrying"
  | "identity_mismatch"
  | "needs_reupload"
  | "failed";

export type ReprocessingRun = {
  outcome: "ready" | "pending" | "attention";
  ready: number;
  requests: number;
};

// The PMC reader checkpoints a header and each PDF page separately. A
// "continued" response is progress on one file, not a completed file.
export async function drainCaseReprocessing(
  expectedReady: number,
  requestNext: () => Promise<ReprocessingStep>,
  onProgress: (ready: number) => void,
  shouldStop: () => boolean = () => false,
  maxRequests = 24,
): Promise<ReprocessingRun> {
  let ready = 0;
  let requests = 0;
  while (ready < expectedReady && requests < maxRequests && !shouldStop()) {
    const step = await requestNext();
    requests += 1;
    if (step === "ready") {
      ready += 1;
      onProgress(ready);
    } else if (step === "idle" || step === "retrying") {
      return { outcome: "pending", ready, requests };
    } else if (step !== "continued") {
      return { outcome: "attention", ready, requests };
    }
  }
  return { outcome: ready === expectedReady ? "ready" : "pending", ready, requests };
}
