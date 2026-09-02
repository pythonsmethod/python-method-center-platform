import { createHash } from "node:crypto";
import { CASE_REVIEW_SYSTEM_PROMPT } from "@/lib/assistant/case-review";
import { METADATA_SYSTEM_PROMPT } from "@/lib/assistant/metadata";
import { TRANSCRIPTION_SYSTEM_PROMPT } from "@/lib/assistant/transcription";
import { referenceSetVersion } from "@/lib/reference/tables";

// What produced an interpretation, written down beside it.
//
// Without this a regression has nothing to stand on. When an answer changes,
// the first question is always which of five things changed: the model that
// read the paper, the code that did the arithmetic, the words the model was
// given, the rules, or the thresholds. Five fields, all required, every
// time — section 6.3 of the specification, and the test that pins it.

// The arithmetic itself. Bumped by hand when the analysis code changes in a
// way that could move an answer; a commit hash would change on every
// comment edit and say nothing.
export const ANALYSIS_ENGINE_VERSION = "ankh-analysis-1.0.0";

export type AnalysisVersions = {
  extraction_model_version: string;
  analysis_engine_version: string;
  prompt_version: string;
  rule_set_version: string;
  threshold_set_version: string;
};

function short(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

// The prompts, fingerprinted rather than versioned by hand: a prompt edit
// that nobody remembered to version is exactly the change this exists to
// catch.
export function promptVersion(): string {
  return [
    `read=${short(TRANSCRIPTION_SYSTEM_PROMPT)}`,
    `header=${short(METADATA_SYSTEM_PROMPT)}`,
    `review=${short(CASE_REVIEW_SYSTEM_PROMPT)}`
  ].join(";");
}

// The reference set, split the way the specification splits it: rules
// (which analyte needs which companion, and how a caption or a unit is
// spelled) apart from thresholds (factors and variation figures).
function splitReferenceSet(): { rules: string; thresholds: string } {
  const parts = referenceSetVersion().split(";");
  const pick = (names: string[]) =>
    parts.filter((part) => names.some((name) => part.startsWith(`${name}=`))).join(";");

  return {
    rules: pick(["blockers", "labels", "aliases"]),
    thresholds: pick(["units", "variation"])
  };
}

export function analysisVersions(extractionModelVersion: string): AnalysisVersions {
  const reference = splitReferenceSet();

  return {
    extraction_model_version: extractionModelVersion,
    analysis_engine_version: ANALYSIS_ENGINE_VERSION,
    prompt_version: promptVersion(),
    rule_set_version: reference.rules,
    threshold_set_version: reference.thresholds
  };
}

// Whether a record carries all five, none of them empty. Used at the one
// place interpretations are written, so a run cannot be stored half-stamped.
export function hasAllVersions(record: Partial<AnalysisVersions>): record is AnalysisVersions {
  return (
    [
      "extraction_model_version",
      "analysis_engine_version",
      "prompt_version",
      "rule_set_version",
      "threshold_set_version"
    ] as const
  ).every((key) => typeof record[key] === "string" && record[key]!.trim().length > 0);
}
