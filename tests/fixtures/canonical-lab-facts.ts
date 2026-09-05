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
