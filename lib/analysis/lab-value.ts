import { resolveAnalyteLabel } from "@/lib/analysis/analyte-labels";
import { resolveUnit } from "@/lib/analysis/unit-resolver";
import { referenceSetVersion } from "@/lib/reference/tables";

// One line of a laboratory form, turned into the row that gets stored.
//
// This is where the two resolvers meet: the caption becomes an analyte code
// and the number becomes a canonical value, or neither does and the row
// says so. It is deliberately pure — it reads no database and writes none,
// so the arithmetic and the refusals can be tested directly.

export type ExtractedRow = {
  // Exactly as printed on the form.
  labelPrinted: string;
  value: number;
  unitPrinted?: string | null;
  referencePrinted?: string | null;
  measuredOn?: string | null;
  // Whether both readings of the document found the same interval. Unstated
  // counts as unconfirmed: the difference between two readings of an
  // interval is a factor of ten in what the value means.
  referenceConfirmed?: boolean;
};

export type LabValueRecord = {
  measured_on: string | null;
  label_original: string;
  analyte: string | null;
  value_original: number;
  unit_original: string | null;
  reference_original: string | null;
  reference_low: number | null;
  reference_high: number | null;
  unit_resolved: string | null;
  unit_resolution_method: string;
  value_canonical: number | null;
  conversion_factor: number | null;
  position_in_reference: number | null;
  unresolved_reason: string | null;
  reference_set_version: string;
};

// Whether a row still needs a person. Both halves count: a number in a
// known unit under a caption nobody recognised is not usable either.
export function needsHumanReview(record: LabValueRecord): boolean {
  return record.analyte === null || record.unit_resolution_method === "unresolved";
}

export function buildLabValue(row: ExtractedRow): LabValueRecord {
  const label = resolveAnalyteLabel(row.labelPrinted);
  const analyte = label.status === "resolved" ? label.analyte : null;

  const base = {
    measured_on: row.measuredOn ?? null,
    label_original: row.labelPrinted,
    analyte,
    value_original: row.value,
    reference_set_version: referenceSetVersion()
  };

  // An unrecognised caption stops everything: the conversion table is keyed
  // by analyte, so there is nothing to convert towards. The row is kept
  // whole — caption, number, unit and interval as printed — because the
  // person who settles it needs to read exactly what the form said.
  if (!analyte) {
    const unit = (row.unitPrinted ?? "").trim();
    const reference = (row.referencePrinted ?? "").trim();

    return {
      ...base,
      unit_original: unit.length > 0 ? unit : null,
      reference_original: reference.length > 0 ? reference : null,
      reference_low: null,
      reference_high: null,
      unit_resolved: null,
      unit_resolution_method: "unresolved",
      value_canonical: null,
      conversion_factor: null,
      position_in_reference: null,
      unresolved_reason: `Подпись «${row.labelPrinted}» не найдена в справочнике показателей. Нужна проверка человеком.`
    };
  }

  const resolution = resolveUnit({
    analyte,
    value: row.value,
    unitPrinted: row.unitPrinted,
    referencePrinted: row.referencePrinted,
    referenceConfirmed: row.referenceConfirmed
  });

  return {
    ...base,
    unit_original: resolution.unitOriginal.length > 0 ? resolution.unitOriginal : null,
    reference_original:
      resolution.referenceOriginal.length > 0 ? resolution.referenceOriginal : null,
    reference_low: resolution.referenceLow,
    reference_high: resolution.referenceHigh,
    unit_resolved: resolution.unitResolved,
    unit_resolution_method: resolution.method,
    value_canonical: resolution.valueCanonical,
    conversion_factor: resolution.conversionFactor,
    // Kept even for an unresolved row: the position is computed against the
    // interval on the same scale as the value, so it is meaningful whether
    // or not the scale itself was identified.
    position_in_reference: resolution.positionInReference,
    unresolved_reason: resolution.unresolvedReason
  };
}
