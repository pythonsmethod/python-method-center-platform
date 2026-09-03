import type { CanonicalFactPersistenceInput } from "@/lib/canonical-facts/persistence";
import type { CanonicalLabFact } from "@/lib/canonical-facts/types";

type StoredRun = CanonicalFactPersistenceInput & { extractionId: string };

/** Non-PHI local verification harness mirroring the migration's two idempotency keys. */
export class InMemoryCanonicalFactStaging {
  private runs = new Map<string, StoredRun>();
  private facts = new Map<string, CanonicalLabFact>();

  private runKey(input: CanonicalFactPersistenceInput) {
    return [input.sourceDocumentId, input.sourceFingerprint, input.extractionProvider, input.extractionVersion, input.parserVersion].join("|");
  }

  persist(input: CanonicalFactPersistenceInput) {
    const key = this.runKey(input);
    const extractionId = this.runs.get(key)?.extractionId ?? `local-run-${this.runs.size + 1}`;
    this.runs.set(key, { ...input, extractionId });
    for (const fact of input.facts) this.facts.set(`${extractionId}|${fact.factFingerprint}`, structuredClone(fact));
    return { extractionId, factCount: input.facts.length };
  }

  readBack(extractionId: string) {
    return [...this.facts.entries()]
      .filter(([key]) => key.startsWith(`${extractionId}|`))
      .map(([, fact]) => structuredClone(fact));
  }

  counts() {
    return { runs: this.runs.size, facts: this.facts.size };
  }
}
