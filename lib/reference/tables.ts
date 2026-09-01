import analyteLabels from "@/config/reference/analyte_labels.json";
import analyteUnits from "@/config/reference/analyte_units.json";
import biologicalVariation from "@/config/reference/biological_variation.json";
import interpretationBlockers from "@/config/reference/interpretation_blockers.json";
import unitAliases from "@/config/reference/unit_aliases.json";

// The reference tables the analysis modules read, and the one place they
// are read from.
//
// They are data, not code: a threshold, a conversion factor or a biological
// variation figure is a clinical fact that a doctor signs off, and a fact
// that lives inside a function is a fact nobody can review. Extending a
// table is editing JSON; it never means editing logic.
//
// Every value carried here is provisional until checked against its source:
// the variation figures against the EFLM database, the unit fingerprints
// against a run over the centre's own anonymised documents.
//
// There is deliberately no table of critical thresholds. The centre does
// rehabilitation and recovery; it is not an emergency service, and a
// person in danger has to call one rather than wait for a platform to
// notice. An automatic alarm here would promise something the centre
// cannot deliver, so the specification's Safety Screen was removed rather
// than built.

export const REFERENCE_TABLES = {
  analyteUnits,
  biologicalVariation,
  interpretationBlockers,
  // How one unit is spelled in the forms of different countries. A table
  // of spellings rather than clinical facts: it carries no factor and no
  // threshold, only the knowledge that «г/л» and «g/L» are one unit.
  unitAliases,
  // How a показатель is captioned in a form, against the same analyte
  // codes the tables above use. Also spellings rather than facts, and
  // deliberately the only such dictionary: a second list of analyte codes
  // is a second thing to keep in step, which is a second thing to get
  // wrong.
  analyteLabels
} as const;

export type ReferenceTableName = keyof typeof REFERENCE_TABLES;

// What produced an interpretation, recorded alongside it. Without this a
// regression is unattributable: when an answer changes, the question is
// always whether the code changed or the table underneath it did.
export function referenceSetVersion(): string {
  return [
    `units=${analyteUnits._meta.version}`,
    `variation=${biologicalVariation._meta.version}`,
    `blockers=${interpretationBlockers._meta.version}`,
    `aliases=${unitAliases._meta.version}`,
    `labels=${analyteLabels._meta.version}`
  ].join(";");
}
