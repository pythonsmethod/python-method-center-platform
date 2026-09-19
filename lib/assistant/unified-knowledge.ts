import { createHash } from "node:crypto";
import { isUuid } from "@/lib/utils/uuid";

export const UNIFIED_NOTE_MAX = 7200;
export type UnifiedNoteInput = { text: string; requestId: string; caseId: string | null; locale: "ru" | "en" };

export function parseUnifiedNote(value: unknown): UnifiedNoteInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !["text", "requestId", "caseId", "locale", "confirmed"].includes(key))) return null;
  if (input.confirmed !== true || typeof input.text !== "string" || !input.text.trim() || input.text.length > UNIFIED_NOTE_MAX || typeof input.requestId !== "string" || !isUuid(input.requestId)) return null;
  if (input.caseId != null && (typeof input.caseId !== "string" || !isUuid(input.caseId))) return null;
  if (input.locale !== "ru" && input.locale !== "en") return null;
  return { text: input.text.trim(), requestId: input.requestId, caseId: typeof input.caseId === "string" ? input.caseId : null, locale: input.locale };
}

export function unifiedKnowledgeRecord(actorId: string, input: UnifiedNoteInput) {
  // Actor-scoped idempotency. Reusing a request ID cannot overwrite any record.
  const hash = createHash("sha256").update(`anham-knowledge-v1:${actorId}:${input.requestId}`).digest("hex");
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  const provenance = { kind: "karen_saved_material", source_case_id: input.caseId, saved_by: actorId, confirmation: "explicit", clinical_verification: "not_implied", client_publication: "not_performed" };
  return {
    id,
    title: `${input.locale === "ru" ? "Анхам" : "Anham"}: ${input.text.split(/\r?\n/)[0]}`.slice(0, 200),
    content: `ANHAM_KNOWLEDGE_V1\n${JSON.stringify(provenance)}\n\n${input.text}`,
    audience: "staff" as const,
    collection: "general" as const,
    topic: "general",
    is_active: true,
    created_by: actorId
  };
}
