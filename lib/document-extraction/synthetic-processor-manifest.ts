// Verified read-only in Google Cloud Manage versions on 2026-09-17.
// Only fixed-fixture Preview diagnostics use this pin; cloud default is unchanged.
export const SYNTHETIC_PROCESSOR = Object.freeze({
  projectId: "pythons-ankh-analysis",
  location: "us",
  processorId: "2ca773b0daa15488",
  processorVersionId: "pretrained-ocr-v2.1-2024-08-07",
});
export const SYNTHETIC_PROCESSOR_MANIFEST = Object.freeze({
  id: "anham-google-synthetic-v2",
  ...SYNTHETIC_PROCESSOR,
  parser: "google-native-table-parser-v1",
  preprocessing: "frozen-raster-stress-v1",
  scoring: "source-cell-exact-v1",
  trust: "diagnostic-review-only-v1",
  schema: "canonical-lab-fact-v1",
  prompt: null,
});
