import analyteUnits from "@/config/reference/analyte_units.json";
import biologicalVariation from "@/config/reference/biological_variation.json";
import criticalValues from "@/config/reference/critical_values.json";
import interpretationBlockers from "@/config/reference/interpretation_blockers.json";
import unitAliases from "@/config/reference/unit_aliases.json";

// The four reference tables the analysis modules read, and the one place
// they are read from.
//
// They are data, not code: a threshold, a conversion factor or a biological
// variation figure is a clinical fact that a doctor signs off, and a fact
// that lives inside a function is a fact nobody can review. Extending a
// table is editing JSON; it never means editing logic.
//
// Every value carried here is provisional until checked against its source:
// the variation figures against the EFLM database, the critical thresholds
// against a licensed doctor's signature, the unit fingerprints against a
// run over the centre's own anonymised documents.

export const REFERENCE_TABLES = {
  analyteUnits,
  biologicalVariation,
  criticalValues,
  interpretationBlockers,
  // How one unit is spelled in the forms of different countries. A table
  // of spellings rather than clinical facts: it carries no factor and no
  // threshold, only the knowledge that «г/л» and «g/L» are one unit.
  unitAliases
} as const;

export type ReferenceTableName = keyof typeof REFERENCE_TABLES;

// What produced an interpretation, recorded alongside it. Without this a
// regression is unattributable: when an answer changes, the question is
// always whether the code changed or the table underneath it did.
export function referenceSetVersion(): string {
  return [
    `units=${analyteUnits._meta.version}`,
    `variation=${biologicalVariation._meta.version}`,
    `critical=${criticalValues._meta.version}`,
    `blockers=${interpretationBlockers._meta.version}`,
    `aliases=${unitAliases._meta.version}`
  ].join(";");
}

// Whether the critical-value thresholds carry a doctor's signature.
//
// Section 3 of the specification makes this a blocking condition rather
// than a warning: an unsigned list of thresholds decides, in production,
// which results reach a person within the hour. The file says so itself in
// `_meta.blocking`, and the check is programmatic because a rule that only
// exists in a document is a rule that ships unnoticed.
export function criticalValuesApproved(): boolean {
  // The field holds null in the file today, so TypeScript reads its type as
  // exactly null. It is a signature waiting to be written, not a constant.
  const approver: unknown = criticalValues._meta.approved_by;

  return typeof approver === "string" && approver.trim().length > 0;
}

// Called where the Safety Screen would run. Returns the reason it must not,
// so the caller states it plainly rather than failing quietly.
export function criticalValuesBlockReason(): string | null {
  if (criticalValuesApproved()) {
    return null;
  }

  return (
    "Пороги критических значений не подписаны: поле approved_by в " +
    "config/reference/critical_values.json пустое. До подписи врача с " +
    "лицензией скрининг работает только в тестовом окружении."
  );
}
