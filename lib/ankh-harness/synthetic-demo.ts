import { GoogleDocumentAIProvider } from "@/lib/document-extraction/google-document-ai";
import { CONNECTED_HARNESS_ENVIRONMENT, runConnectedAnkhHarness } from "./connected-pipeline";

const polygon = (row: number) => ({ normalizedVertices: [{ x: 0.05, y: row * 0.08 + 0.05 }, { x: 0.95, y: row * 0.08 + 0.05 }, { x: 0.95, y: row * 0.08 + 0.1 }, { x: 0.05, y: row * 0.08 + 0.1 }] });

export function googleLikeSyntheticResponse(text: string, qualityScore = 0.99) {
  const tokenMatches = [...text.matchAll(/\S+/g)];
  return { document: { text, pages: [{ pageNumber: 1, imageQualityScores: { qualityScore }, detectedLanguages: [{ languageCode: "en", confidence: 0.99 }], blocks: [{ layout: { textAnchor: { textSegments: [{ startIndex: "0", endIndex: String(text.length) }] }, confidence: 0.99, boundingPoly: polygon(0) } }], tokens: tokenMatches.map((match, index) => ({ layout: { textAnchor: { textSegments: [{ startIndex: String(match.index), endIndex: String((match.index ?? 0) + match[0].length) }] }, confidence: 0.99, boundingPoly: polygon(index % 9) } })), tables: [] }] } };
}

const normalizer = new GoogleDocumentAIProvider({ projectId: "synthetic-project", location: "us", processorId: "synthetic-processor", accessToken: async () => { throw new Error("External access is disabled in the synthetic harness"); } });

export function normalizeSyntheticGoogleLike(text: string, qualityScore = 0.99) {
  return normalizer.normalize_response(googleLikeSyntheticResponse(text, qualityScore));
}

export function buildSyntheticConnectedDemo() {
  const identity = "synthetic-identity-v1";
  const radiology = normalizeSyntheticGoogleLike("RADIOLOGY REPORT\nFINDINGS: Synthetic left breast observation 10 x 12 x 14 mm.\nBI-RADS CATEGORY: 4\nRECOMMENDATION: Synthetic follow-up only.");
  const pathology = normalizeSyntheticGoogleLike("SURGICAL PATHOLOGY\nFINAL DIAGNOSIS: Synthetic tissue observation.\n-mitoses-8 mitoses/10HPF), score 2.\nEstrogen Receptor: Positive");
  return runConnectedAnkhHarness({ environment: CONNECTED_HARNESS_ENVIRONMENT, externalCallsAllowed: false, persistenceAllowed: false, caseAlias: "synthetic-connected-demo", expectedContext: ["clinical_history", "event_dates"], documents: [
    { caseAlias: "synthetic-connected-demo", sourceDocumentId: "synthetic-radiology-v1", currentVersion: "v1", candidateVersion: "v1", caseIdentityHash: identity, documentIdentityHash: identity, providerVersion: "google-like-normalized-v1", parserVersion: "connected-harness-v1", normalized: radiology },
    { caseAlias: "synthetic-connected-demo", sourceDocumentId: "synthetic-pathology-v1", currentVersion: "v1", candidateVersion: "v1", caseIdentityHash: identity, documentIdentityHash: identity, providerVersion: "google-like-normalized-v1", parserVersion: "connected-harness-v1", normalized: pathology },
  ] });
}
