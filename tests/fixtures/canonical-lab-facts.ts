import type { ExtractedLabRow } from "@/lib/canonical-facts";

const box = { normalizedVertices: [{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.3 }, { x: 0.1, y: 0.3 }] };

export const fixtureA: ExtractedLabRow[] = [
  ["Hemoglobin", "9.6", "g/dL", "12.0–15.5", "LOW"],
  ["Ferritin", "14", "ng/mL", "15–150", "LOW"],
  ["ALT", "62", "U/L", "7–35", "HIGH"],
  ["Albumin", "32", "g/L", "35–50", "LOW"]
].map(([originalTestName, valueOriginal, unitOriginal, referenceOriginal, labFlagOriginal]) => ({
  originalTestName, valueOriginal, unitOriginal, referenceOriginal, labFlagOriginal,
  sourcePage: 1, sourceCoordinates: box, extractionConfidence: 0.98
}));

export const fixtureB: ExtractedLabRow = { originalTestName: "Glucose", valueOriginal: "5,4", unitOriginal: "mmol/L", sourcePage: 1, sourceCoordinates: box, extractionConfidence: 0.97 };
export const fixtureC: ExtractedLabRow = { originalTestName: "CRP", valueOriginal: "< 1.0", unitOriginal: "mg/L", referenceOriginal: "≤ 3.5", sourcePage: 1, sourceCoordinates: box, extractionConfidence: 0.96 };
export const fixtureD: ExtractedLabRow = { originalTestName: "Ferritin", valueOriginal: "14", unitOriginal: "ng/mL", sourcePage: 1, sourceCoordinates: box, extractionConfidence: 0.97 };
export const fixtureE: ExtractedLabRow[] = [fixtureA[0], { ...fixtureA[1], sourcePage: 2 }];
export const fixtureF: ExtractedLabRow = { originalTestName: "Albumin", valueOriginal: "32", unitOriginal: "g/L", referenceOriginal: "35–50", sourcePage: 1, sourceCoordinates: box, extractionConfidence: 0.61, associationAmbiguous: true };
export const fixtureG: ExtractedLabRow[] = [fixtureA[0], { ...fixtureA[0] }];

// Deidentified regression shape derived from a consented bilingual RU/KG lab-table layout.
// It intentionally contains no patient, laboratory, accession, contact or source-document identifiers.
const bilingualRussianLabRows: Array<[string, string, string, string, string | null]> = [
  ["Ферритин", "32,9", "ng/ml", "13–150", null], ["АЛТ", "18,6", "U/L", "<49,00", null],
  ["АСТ", "25,8", "U/L", "<49,00", null], ["ТТГ", "3,09", "мМЕ/л", "0,40–4,00", null],
  ["Т4 свободный", "16,4", "пмоль/л", "9,00–22,00", null], ["HGB", "134", "g/L", "117–160", null],
  ["HCT", "38,9", "%", "35,0–47,0", null], ["RBC", "4,46", "10^12/L", "3,80–5,80", null],
  ["MCV", "87,3", "fL", "81,0–101,0", null], ["MCH", "30,1", "pg", "27,0–34,0", null],
  ["MCHC", "344", "g/L", "300–380", null], ["RDW-CV", "13,5", "%", "11,6–14,8", null],
  ["RDW-SD", "42,0", "fL", "37,0–54,0", null], ["NRBC#", "0,000", "10^12/L", "0,00–0,03", null],
  ["NRBC%", "0,00", "%", "0,00–0,50", null], ["WBC", "6,96", "10^9/L", "4,00–10,00", null],
  ["Neu#", "3,57", "10^9/L", "1,80–7,70", null], ["Lym#", "2,70", "10^9/L", "1,00–4,80", null],
  ["Mon#", "0,51", "10^9/L", "0,05–0,82", null], ["Eos#", "0,15", "10^9/L", "0,02–0,50", null],
  ["Bas#", "0,03", "10^9/L", "0,00–0,08", null], ["IMG#", "0,01", "10^9/L", "0,00–0,07", null],
  ["Neu%", "51,3", "%", "47,0–72,0", null], ["Lym%", "38,9", "%", "19,0–37,0", "H"],
  ["Mon%", "7,3", "%", "3,0–12,0", null], ["Eos%", "2,1", "%", "1,0–5,0", null],
  ["Bas%", "0,4", "%", "0,0–1,2", null], ["IMG%", "0,2", "%", "0,00–0,70", null],
  ["PLT", "376", "10^9/L", "150–400", null], ["MPV", "8,6", "fL", "9,4–12,4", "L"],
  ["PDW", "15,3", "fL", "10,0–20,0", null], ["PCT", "0,323", "%", "0,100–0,400", null],
  ["P-LCR", "15,3", "%", "13,0–43,0", null], ["СОЭ", "11", "мм/ч", "2,00–30,00", null]
];

export const bilingualRussianLabFixture: ExtractedLabRow[] = bilingualRussianLabRows.map(([originalTestName, valueOriginal, unitOriginal, referenceOriginal, labFlagOriginal]) => ({
  originalTestName, valueOriginal, unitOriginal, referenceOriginal, labFlagOriginal,
  sourcePage: 1, sourceCoordinates: box, extractionConfidence: 0.98
}));
