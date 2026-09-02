import { forInterpretation, personFactsFrom, type BlockAssessment, type Measurement } from "@/lib/analysis/blockers";
import { buildLabValue, needsHumanReview, type LabValueRecord } from "@/lib/analysis/lab-value";
import { assessTrend, type TrendAssessment, type TrendPoint } from "@/lib/analysis/trend-gate";
import { analysisVersions, type AnalysisVersions } from "@/lib/analysis/versions";
import type { QuestionnaireVersion } from "@/lib/health/questionnaire";

// The analysis run: modules 1, 3 and 4 in the order the specification sets,
// over one case's extracted values.
//
// Pure. It reads no database and writes none, so the whole run — which
// values resolved, which were blocked, which trends cleared the threshold
// and which did not — can be tested as arithmetic. The worker around it
// does the reading and writing.
//
// The stage list is the specification's section 6.1 with one stage gone:
// the safety screen, removed by the owner's decision. Everything before
// full extraction happens in the worker (it needs the file); everything
// after "analysis" is a person's work. This function is the middle.

export const PIPELINE_STAGES = [
  "upload",
  "quality_gate",
  "metadata_pre_extraction",
  "identity_resolver",
  "document_classification",
  "duplicate_version_detection",
  "full_extraction",
  "unit_resolution",
  "confidence_routing",
  "canonicalization",
  "timeline",
  "context_assembly",
  "interpretation_blocker_check",
  "analysis_rcv",
  "validation",
  "routing_karen_screen",
  "decision",
  "client_response",
  "learning_record"
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

// One agreed row from the double reading, as the extraction table stores it.
export type ExtractedValueRow = {
  label: string;
  value: string;
  reference: string;
  referenceConfirmed: boolean;
};

export type ExtractedDocument = {
  documentId: string;
  // From the header pass. Null when the form printed no date the parser
  // could read — and then every value of this document has no date, and
  // no place on a line.
  collectionDate: string | null;
  agreed: ExtractedValueRow[];
};

// A value already in lab_values from an earlier document of the case.
export type PriorLabValue = {
  documentId: string | null;
  analyte: string | null;
  measured_on: string | null;
  value_canonical: number | null;
  unit_resolved: string | null;
  unit_resolution_method: string;
  reference_low: number | null;
  reference_high: number | null;
  position_in_reference: number | null;
};

export type AnalysisInput = {
  documents: ExtractedDocument[];
  prior: PriorLabValue[];
  questionnaire: Pick<QuestionnaireVersion, "birth_date" | "sex"> | null;
  extractionModelVersion: string;
};

export type NewLabValue = LabValueRecord & { document_id: string };

export type AnalysisRun = {
  versions: AnalysisVersions;
  stages: readonly PipelineStage[];
  // Module 1: every numeric row, resolved or refused.
  labValues: NewLabValue[];
  // Rows a person has to settle: unknown caption or unresolved unit.
  humanReview: NewLabValue[];
  // The "UNIT_UNRESOLVED" state of the specification, as a fact about this
  // run rather than a status on the case.
  unitUnresolved: boolean;
  // Module 4: what could not be read alone, and what to ask for.
  blocked: BlockAssessment[];
  requests: string[];
  // Module 3: one assessment per analyte whose newest value was readable.
  trends: Record<string, TrendAssessment>;
  // Values that never reached analysis and why — nothing leaves silently.
  excluded: Array<{ analyte: string; documentId: string; reason: string }>;
};

// "9,6 г/л" → 9.6 and "г/л". A row whose value does not start with a
// number is text — a conclusion, a drug name — and is not a lab value.
export function splitValue(printed: string): { value: number; unit: string } | null {
  const match = printed.trim().match(/^([<>≤≥]?\s*)?(\d+(?:[.,]\d+)?)\s*(.*)$/);

  if (!match) {
    return null;
  }

  const value = Number(match[2].replace(",", "."));

  if (!Number.isFinite(value)) {
    return null;
  }

  // "< 5" is a limit, not a measurement: the number is not the value.
  if (match[1] && match[1].trim().length > 0) {
    return null;
  }

  return { value, unit: match[3].trim() };
}

function toMeasurement(row: NewLabValue | PriorLabValue, documentId: string): Measurement & { documentId: string } {
  return {
    analyte: row.analyte ?? "",
    measuredOn: row.measured_on,
    valueCanonical: row.value_canonical,
    unitResolved: row.unit_resolved,
    documentId
  };
}

function toPoint(row: NewLabValue | PriorLabValue): TrendPoint {
  return {
    valueCanonical: row.value_canonical,
    unitResolutionMethod: row.unit_resolution_method,
    unitResolved: row.unit_resolved,
    measuredOn: row.measured_on,
    positionInReference: row.position_in_reference,
    referenceLow: row.reference_low,
    referenceHigh: row.reference_high
  };
}

export function runAnalysis(input: AnalysisInput): AnalysisRun {
  const versions = analysisVersions(input.extractionModelVersion);

  // --- unit_resolution, confidence_routing, canonicalization (Module 1) ---
  const labValues: NewLabValue[] = [];

  for (const document of input.documents) {
    for (const row of document.agreed) {
      const split = splitValue(row.value);

      if (!split) {
        continue;
      }

      labValues.push({
        ...buildLabValue({
          labelPrinted: row.label,
          value: split.value,
          unitPrinted: split.unit,
          referencePrinted: row.reference,
          referenceConfirmed: row.referenceConfirmed,
          measuredOn: document.collectionDate
        }),
        document_id: document.documentId
      });
    }
  }

  const humanReview = labValues.filter(needsHumanReview);
  const unitUnresolved = humanReview.some((row) => row.analyte !== null);

  // --- timeline, context_assembly ---
  // Everything readable, old and new, in one list; the blockers look for
  // companions across the whole case, not only the newest document.
  const resolvedNew = labValues.filter((row) => !needsHumanReview(row));
  const resolvedPrior = input.prior.filter(
    (row) => row.analyte !== null && row.value_canonical !== null && row.unit_resolution_method !== "unresolved"
  );
  const measurements = [
    ...resolvedNew.map((row) => toMeasurement(row, row.document_id)),
    ...resolvedPrior.map((row) => toMeasurement(row, row.documentId ?? ""))
  ];
  const personFacts = personFactsFrom(input.questionnaire);

  // --- interpretation_blocker_check (Module 4) ---
  // Only the new values are assessed; the whole case is where their
  // companions are looked for.
  const newMeasurements = measurements.slice(0, resolvedNew.length);
  const { interpretable: readable, blocked } = forInterpretation(newMeasurements, personFacts, measurements);

  // --- analysis_rcv (Module 3) ---
  const trends: Record<string, TrendAssessment> = {};
  const excluded: AnalysisRun["excluded"] = [];

  for (const analyte of new Set(readable.map((m) => m.analyte))) {
    const series = [...resolvedPrior, ...resolvedNew]
      .filter((row) => row.analyte === analyte)
      .filter((row) => {
        if (row.measured_on) {
          return true;
        }

        excluded.push({
          analyte,
          documentId: "document_id" in row ? row.document_id : (row.documentId ?? ""),
          reason: "Нет даты забора, поэтому значение не встаёт на линию."
        });
        return false;
      })
      .sort((a, b) => String(a.measured_on).localeCompare(String(b.measured_on)));

    if (series.length === 0) {
      continue;
    }

    trends[analyte] = assessTrend(analyte, series.map(toPoint));
  }

  for (const assessment of blocked) {
    excluded.push({
      analyte: assessment.analyte,
      documentId: newMeasurements.find((m) => m.analyte === assessment.analyte)?.documentId ?? "",
      reason: "Заблокирован для интерпретации: нет спутника."
    });
  }

  return {
    versions,
    stages: PIPELINE_STAGES,
    labValues,
    humanReview,
    unitUnresolved,
    blocked,
    requests: blocked.map((a) => a.request).filter((r): r is string => Boolean(r)),
    trends,
    excluded
  };
}
