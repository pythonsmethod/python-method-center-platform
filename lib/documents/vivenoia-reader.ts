import { readIsolatedDocument } from "@/lib/assistant/router";
import type { AssistantResult } from "@/lib/assistant/claude";
import type { ChatAttachment } from "@/lib/assistant/attachments";
import {
  readDocument,
  DOCUMENT_READ_VERSION,
  type DocumentReadGrant,
  type DocumentReadProvider,
  type DocumentReadReceipt,
} from "@/lib/vivenoia/document-read";

const provider: DocumentReadProvider = {
  id: "pmc-approved-document-reader",
  model: "current-approved-document-reader",
  async read(input) {
    const result = await readIsolatedDocument(input.system, input.instruction, input.maxTokens, input.attachment);
    if (result.status === "ok") {
      return result.refusal ? { outcome: "refused" } : { outcome: "complete", text: result.reply };
    }
    return {
      outcome: "failed",
      code: result.status === "unavailable"
        ? "PROVIDER_UNAVAILABLE"
        : result.code === "INCOMPLETE_RESPONSE" || result.code === "INVALID_RESPONSE"
          ? "INCOMPLETE_RESPONSE"
          : "PROVIDER_FAILED",
    };
  },
};

export function createPmcVivenoiaDocumentReader(input: {
  operationSeed: string;
  profileId: string;
  caseId: string;
  documentId: string;
  sourceVersion: string;
  attachment: ChatAttachment;
}) {
  const grant: DocumentReadGrant = {
    scope: {
      organizationId: "pmc",
      applicationId: "pmc-document-worker",
      actorId: "service:pmc-document-worker",
      subjectId: `${input.profileId}:${input.caseId}`,
    },
    source: { id: input.documentId, version: input.sourceVersion },
    providerId: provider.id,
    maxBytes: 25 * 1024 * 1024,
  };
  const receipts: DocumentReadReceipt[] = [];
  return {
    receipts,
    modelVersion: `vivenoia-document-read-v${DOCUMENT_READ_VERSION};pmc-page-reader-v1`,
    async read(stage: string, system: string, instruction: string, maxTokens: number): Promise<AssistantResult> {
      const result = await readDocument({
        version: DOCUMENT_READ_VERSION,
        operationId: `${input.operationSeed}:${stage}`,
        scope: grant.scope,
        source: { ...grant.source, attachment: input.attachment },
        policy: { id: `pmc-${stage}`, version: "1", system, instruction, maxTokens },
      }, grant, provider);
      receipts.push(result.receipt);
      if (result.outcome === "complete") return { status: "ok", reply: result.text };
      if (result.outcome === "failed" && result.code === "PROVIDER_UNAVAILABLE") return { status: "unavailable", failureClass: "not_configured" };
      return { status: "error", code: result.outcome === "failed" && result.code === "INCOMPLETE_RESPONSE" ? "INCOMPLETE_RESPONSE" : "INVALID_RESPONSE", message: "VIVENOIA document reading failed" };
    },
  };
}
