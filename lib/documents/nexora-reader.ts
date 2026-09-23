import { createHash } from "node:crypto";
import { documentReadingProvider, readIsolatedDocument } from "@/lib/assistant/router";
import type { AssistantResult } from "@/lib/assistant/response-contract";
import type { ChatAttachment } from "@/lib/assistant/attachments";
import {
  readDocument, DOCUMENT_READ_VERSION,
  type DocumentReadGrant, type DocumentReadProvider, type DocumentReadReceipt
} from "@/lib/nexora/document-read";

// The existing, permitted reader. Model replacement is a separate acceptance.
const provider: DocumentReadProvider = {
  ...documentReadingProvider(),
  async read(input) {
    const result = await readIsolatedDocument(input.system, input.instruction, input.maxTokens, input.attachment);
    if (result.status === "ok") return result.refusal
      ? { outcome: "refused" }
      : { outcome: "complete", text: result.reply };
    return { outcome: "failed", code: result.status === "unavailable" ? "PROVIDER_UNAVAILABLE"
      : result.code === "INCOMPLETE_RESPONSE" || result.code === "INVALID_RESPONSE" ? "INCOMPLETE_RESPONSE" : "PROVIDER_FAILED" };
  }
};

/** All fields are derived from a claimed server job and its scoped source row. */
export function createPmcDocumentReader(input: {
  jobId: string; attempt: number; lockedAt: string; profileId: string; caseId: string;
  documentId: string; sourceVersion: string; attachment: ChatAttachment;
}) {
  const grant: DocumentReadGrant = {
    scope: { organizationId: "pmc", applicationId: "pmc-document-worker", actorId: "service:pmc-document-worker", subjectId: `${input.profileId}:${input.caseId}` },
    source: { id: input.documentId, version: input.sourceVersion },
    providerId: provider.id, maxBytes: 25 * 1024 * 1024
  };
  const runId = createHash("sha256").update(JSON.stringify([
    input.jobId, input.attempt, input.lockedAt, input.documentId, input.sourceVersion
  ])).digest("hex");
  const receipts: DocumentReadReceipt[] = [];
  return {
    receipts,
    modelVersion: `${provider.model};nexora-document-read-v${DOCUMENT_READ_VERSION};pmc-reading-v1`,
    async read(stage: "header" | "transcription-first" | "transcription-second", system: string, instruction: string, maxTokens: number): Promise<AssistantResult> {
      const result = await readDocument({
        version: DOCUMENT_READ_VERSION, operationId: `${runId}:${stage}`,
        scope: grant.scope, source: { ...grant.source, attachment: input.attachment },
        policy: { id: `pmc-${stage}`, version: createHash("sha256").update(JSON.stringify([system, instruction, maxTokens])).digest("hex"), system, instruction, maxTokens }
      }, grant, provider);
      receipts.push(result.receipt);
      if (result.outcome === "complete") return { status: "ok", reply: result.text };
      // A refusal is not a transcription and cannot enter agreed source rows.
      return { status: "error", code: result.outcome === "failed" && result.code === "INCOMPLETE_RESPONSE"
        ? "INCOMPLETE_RESPONSE" : "temporarilyDown", message: `Document reading failed: ${result.code}` };
    }
  };
}

export function documentCapabilityMetadata(metadata: unknown, receipts: DocumentReadReceipt[]) {
  const original = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown> : {};
  // No raw document, response text, name or clinical conclusion in the receipt.
  return { ...original, nexora_document_read: { version: DOCUMENT_READ_VERSION, receipts } };
}
