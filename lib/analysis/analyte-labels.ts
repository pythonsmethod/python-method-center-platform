import { REFERENCE_TABLES } from "@/lib/reference/tables";
import { canonicaliseUnitSpelling } from "@/lib/analysis/unit-resolver";

// Which показатель a line of a laboratory form is about.
//
// Everything downstream — the conversion table, the biological variation
// figure, the interpretation blockers — is keyed by an analyte code. A form
// prints a caption instead: «Гемоглобин», «HGB», «Hb», «Гемоглобин (HGB)».
// Turning the one into the other is this file's whole job.
//
// It matches exactly, against a table of spellings, and refuses everything
// else. No search by substring and no nearest match: «мочевина» and
// «мочевая кислота» share a prefix and are different substances, and BUN
// is a third thing again. A caption nobody wrote down is handed to a
// person, which is slower than guessing and is the point.

export type LabelResolution =
  | { status: "resolved"; analyte: string; matched: string }
  | { status: "unknown"; normalised: string };

// Lowercase, punctuation to spaces, spaces collapsed. Punctuation carries
// no meaning in a caption — «Нейтрофилы абс.» and «Нейтрофилы абс» are one
// spelling — while the letters do.
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/ /g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LABELS: Record<string, { analyte: string; matched: string }> = (() => {
  const map: Record<string, { analyte: string; matched: string }> = {};
  const table = REFERENCE_TABLES.analyteLabels.labels as Record<string, string[]>;

  for (const [analyte, spellings] of Object.entries(table)) {
    for (const spelling of spellings) {
      const key = normalise(spelling);

      if (key.length > 0) {
        map[key] = { analyte, matched: spelling };
      }
    }
  }

  return map;
})();

// A caption often carries the unit: «Глюкоза, ммоль/л». The unit is not
// part of the name, and the table of unit spellings already knows every way
// it is written — so the tail is checked against that table rather than
// against a list of guesses kept here.
//
// It works on the caption as printed rather than on the normalised form,
// because normalising drops the slash that makes «ммоль/л» a unit.
function withoutTrailingUnit(printed: string): string | null {
  const words = printed.trim().split(/\s+/);

  for (let take = 1; take <= Math.min(3, words.length - 1); take += 1) {
    const tail = words.slice(words.length - take).join(" ");

    if (canonicaliseUnitSpelling(tail)) {
      return words.slice(0, words.length - take).join(" ");
    }
  }

  return null;
}

export function resolveAnalyteLabel(printed: string | null | undefined): LabelResolution {
  const normalised = normalise(printed ?? "");

  if (normalised.length === 0) {
    return { status: "unknown", normalised };
  }

  const direct = LABELS[normalised];

  if (direct) {
    return { status: "resolved", analyte: direct.analyte, matched: direct.matched };
  }

  // Both attempts are exact lookups in the same table, so this is a second
  // spelling of the caption rather than a second, looser rule.
  const trimmed = withoutTrailingUnit(printed ?? "");
  const withoutUnit = trimmed ? LABELS[normalise(trimmed)] : undefined;

  if (withoutUnit) {
    return {
      status: "resolved",
      analyte: withoutUnit.analyte,
      matched: withoutUnit.matched
    };
  }

  return { status: "unknown", normalised };
}

// Every analyte the dictionary can name. Used by the tests that keep this
// table and the conversion table from drifting apart.
export function knownAnalytes(): string[] {
  return Object.keys(REFERENCE_TABLES.analyteLabels.labels).sort();
}
