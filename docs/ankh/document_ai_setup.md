# Google Document AI foundation for Ankh Analysis

Status: development foundation only. This provider is not connected to uploaded client documents or any production Case flow.

## Current state

The implementation covers the Master Concept v1.0 Extraction foundation: replaceable OCR, page-level provenance, raw source preservation, confidence/quality signals, and a strict boundary between OCR output and canonical medical facts. It does not add a second Case model, role model, processing classification, or state machine.

| Field | Value |
| --- | --- |
| Provider | Google Cloud Document AI |
| Google Cloud project | `pythons-ankh-analysis` (Pythons Ankh Analysis) |
| Project number | `566941322428` |
| Processor display name | `ankh-enterprise-ocr` |
| Processor ID | `2ca773b0daa15488` |
| Processor type | Document OCR / `OCR_PROCESSOR` |
| Location | `us` |
| State | `ENABLED` |
| Default version | `pretrained-ocr-v2.1-2024-08-07` |
| Process endpoint | `https://us-documentai.googleapis.com/v1/projects/566941322428/locations/us/processors/2ca773b0daa15488:process` |
| Service account | `ankh-document-ai@pythons-ankh-analysis.iam.gserviceaccount.com` |
| Service-account keys | None |

Cloud Document AI API and the processor were verified in this project on 2026-09-01. The older `My First Project` was not used.

## Authentication architecture

The backend receives a short-lived OAuth access token from an injected token provider. `GoogleDocumentAIProvider` does not read credential files or environment secrets itself.

Production on Vercel should use Vercel OIDC -> Google Workload Identity Federation -> service-account impersonation. This avoids a long-lived JSON key. Restrict the federation provider with issuer, audience, subject, Vercel team, project, and environment attribute conditions. Grant the production identity only permission to impersonate this service account. Keep preview and production principals separate.

References:

- [Vercel: connect OIDC to GCP](https://vercel.com/docs/oidc/gcp)
- [Google: Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Google: WIF best practices](https://cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation)

Do not create a public API key. Do not create or commit a service-account JSON key. Do not put OAuth tokens in application logs.

## Least-privilege IAM

The service account has only `roles/documentai.apiUser`. This predefined role grants online and batch processing permissions (`documentai.processors.processOnline`, `documentai.processors.processBatch`, and their processor-version equivalents). It intentionally does not grant processor creation/update/deletion or broad project access.

`get_processor_status()` requires `documentai.processors.get`, which is not included in `roles/documentai.apiUser`. Runtime status reads should therefore either:

1. use a separate operator/read-only identity with `roles/documentai.viewer`; or
2. add a narrowly scoped custom role containing only `documentai.processors.get` if runtime health checks genuinely require it.

Do not broaden the processing identity to Viewer merely for convenience.

Batch processing also requires Cloud Storage:

- input bucket: object read only;
- output bucket/prefix: object create (and object read only if the backend reads results);
- bucket metadata permission only where the selected API flow requires it.

Grant Storage permissions on dedicated buckets/prefixes, not at the project level. No batch bucket was created in this foundation step.

References: [Document AI roles](https://cloud.google.com/iam/docs/roles-permissions/clouddocumentai), [batchProcess permission](https://cloud.google.com/document-ai/docs/reference/rest/v1/projects.locations.processors/batchProcess).

## Environment variables

Non-secret identifiers:

```text
GOOGLE_DOCUMENT_AI_PROJECT_ID=pythons-ankh-analysis
GOOGLE_DOCUMENT_AI_LOCATION=us
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=2ca773b0daa15488
GOOGLE_DOCUMENT_AI_SERVICE_ACCOUNT_EMAIL=ankh-document-ai@pythons-ankh-analysis.iam.gserviceaccount.com
GCP_PROJECT_NUMBER=566941322428
GCP_WORKLOAD_IDENTITY_POOL_ID=<configured-later>
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=<configured-later>
```

The Vercel OIDC token is short-lived and supplied by Vercel at runtime. It is not a repository secret.

## Provider adapter

`DocumentExtractionProvider` defines:

- `process_document()`;
- `batch_process_documents()`;
- `get_processor_status()`;
- `normalize_response()`.

`GoogleDocumentAIProvider` implements the interface without coupling it to the existing document queue. Future `AzureDocumentIntelligenceProvider` and `AwsTextractProvider` implementations can satisfy the same contract.

Example online call:

```ts
const provider = new GoogleDocumentAIProvider({
  projectId: process.env.GOOGLE_DOCUMENT_AI_PROJECT_ID!,
  location: process.env.GOOGLE_DOCUMENT_AI_LOCATION!,
  processorId: process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID!,
  accessToken: getShortLivedGoogleAccessToken
});

const raw = await provider.process_document({
  bytes: pdfBytes,
  mimeType: "application/pdf"
});
const normalized = provider.normalize_response(raw);
```

The provider requests `enableImageQualityScores`. Never log `raw` for real client documents.

## Synthetic OCR smoke test

Input: `output/pdf/ankh_synthetic_lab_report.pdf`. The PDF contains only fictional values and is explicitly labeled `NO PHI`.

The Google Console smoke test on 2026-09-01 recognized:

- full page text;
- patient label `TEST USER` and synthetic report metadata;
- Hemoglobin `9.6 g/dL`, reference `12.0 - 15.5`, `LOW`;
- Ferritin `14 ng/mL`, reference `15 - 150`, `LOW`;
- ALT `62 U/L`, reference `7 - 35`, `HIGH`;
- Albumin `32 g/L`, reference `35 - 50`, `LOW`;
- the table headers and row ordering.

After the account owner completed Google's verification, an authenticated REST smoke test was run from Cloud Shell on 2026-09-01 against the regional `us` endpoint. The request completed successfully and wrote the exact response to `/tmp/ankh-response.json` in Cloud Shell (`583,579` bytes). The request used the same synthetic `NO PHI` PDF and explicitly enabled image-quality scores. No public API key or service-account key was created.

The Console `Export JSON` control still entered a persistent Loading state. The exact response remains a transient Cloud Shell artifact rather than a committed repository fixture because the browser download did not complete reliably. Do not substitute or fabricate a response fixture; repeat the same non-PHI REST request when a durable fixture is required.

## Response structure and capability assessment

The Document AI `Document` response can provide:

- complete `text`;
- `pages[]` and page numbers;
- blocks, paragraphs, lines, tokens, and optional symbols;
- each element's `layout.textAnchor`, confidence, and `boundingPoly` coordinates;
- detected language and confidence;
- page image-quality score and detected defects when explicitly enabled;
- tables/layout relationships when emitted by the processor and document format.

Coordinates and text anchors are suitable for provenance links and visual evidence. Confidence is a routing signal, not proof. Table structure must be benchmarked against laboratory formats; visual row ordering observed in the Console is not enough to claim reliable semantic table extraction.

Document AI output is not the Ankh medical fact table. The next layers remain:

```text
OCR -> parsing -> deterministic validation -> canonical facts -> provenance -> analysis
```

Original text, names, values, units, references, dates, page, and coordinates must remain immutable alongside normalized derivatives. See [Google's response guide](https://cloud.google.com/document-ai/docs/handle-response).

## Pricing assumptions

As checked on 2026-09-01, Enterprise Document OCR lists the first 1,000 pages per month at $0, then $1.50 per 1,000 pages up to 5,000,000 pages and $0.60 per 1,000 above that. OCR add-ons are separately priced. Prices can change; validate the [official pricing page](https://cloud.google.com/products/document-ai/pricing) before budgeting. No capacity reservation or paid add-on was enabled.

Track pages and cost per Case. Failed 4xx/5xx requests are not billed according to the pricing page, but retries of successful processing are billable and require idempotency controls.

## Security and PHI production gate

Real PHI must not be processed until all of these are closed and documented:

- applicable Google Cloud BAA/compliance eligibility and account acceptance;
- organization policies and vendor/data-processing review;
- approved data region (the test processor is `us`);
- workload identity federation and environment-specific principals;
- Data Access audit logs, monitoring, alerting, and access review;
- retention/deletion policy for source documents, OCR responses, logs, backups, and Cloud Storage batch artifacts;
- encryption and key-management decision;
- least-privilege bucket and processor resource bindings;
- incident response, backup/restore tests, and documented break-glass access;
- prohibition on request/response bodies in ordinary application logs;
- privacy/security and regulatory review of patient-facing medical functionality.

The processor currently uses Google-managed encryption. This is not a conclusion that the PHI gate is satisfied.

## OCR benchmark plan

Use a de-identified, manually verified gold dataset and compare Google Document AI, Azure AI Document Intelligence, and AWS Textract. Record exact-match and tolerance-aware metrics for:

- test/analyte name;
- numeric result, decimal separator, signs, and inequalities;
- unit;
- reference range;
- laboratory flag;
- collection/specimen date separately from report/result dates;
- table row/column association;
- missed fields/pages;
- mobile-photo quality and cropping;
- multilingual documents;
- latency (p50/p95) and cost per Case.

Every expected fact must include source document, page, and coordinates. Measure critical numeric accuracy, unit/reference accuracy, missed-abnormal rate, and source traceability. Do not run permanent double OCR by default; route low-confidence or contradictory critical fields to a second provider or human review.

## Production boundary and remaining work

Not implemented and not authorized by this foundation:

- no automatic processing of existing or new client uploads;
- no change to Case, Karen/Ankh roles, client processing, or production queues;
- no canonical medical fact parser or clinical interpretation;
- no batch Cloud Storage buckets or Storage IAM;
- no WIF pool/provider or Vercel principal binding;
- no PHI/BAA/compliance approval;
- no committed raw JSON fixture yet; the authenticated REST response was generated successfully and retained transiently in Cloud Shell, but its browser download did not complete reliably;
- no provider benchmark without a gold dataset.

Exact next recommended action: configure Vercel Workload Identity Federation, then repeat the authenticated non-PHI REST request through the application token path and save the exact response as a development fixture. Validate its text anchors, coordinates, confidence, detected language, quality scores, and table objects before any integration decision.
