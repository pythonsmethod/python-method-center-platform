# First real clinical Case validation — Phase 2.5B

> 2026-09-03 update: authorized OCR replay completed (8/8, still 0 tables). Real minimized R1/R2 and layout fixes were added. Actual TypeScript source-pattern coverage is 11/47 before and 16/47 after, with zero lost prior parser facts. These are not independent exact-value Gold scores. Historical results below remain superseded; see phase_2_5c_report.md. Temporary PHI and raw outputs were deleted and checked; original Gold hash is unchanged.

> **Phase 2.5C correction (2026-09-02): historical report, not an independently validated parser benchmark.** The 46/47 result came from Python regex presence checks, not the repository TypeScript parser. False-VERIFIED was not calculated; expected review IDs determined routing; coordinates were the first overlapping token, not full fact provenance. The mitotic-score target conflicts with the visible source and is not a confirmed OCR failure. The COMPLETE status and quality claims below are superseded by [the Phase 2.5C audit](phase_2_5c_report.md). Real replay remains blocked; historical values are retained for traceability, not endorsement.

Status: **COMPLETE FOR TASK-SCOPED VALIDATION / NO-GO FOR PHASE 3 PRODUCTION**. Architecture, isolated Google Document AI processing, coordinate-backed Gold audit and local verification are complete. No source image or identifiable OCR payload is stored in Git.

## A. Real Case document inventory

Eight owner-provided mobile screenshots represent five logical English-language reports. Repeated screenshots/overlap were grouped as one source report and retained as separate immutable intake files outside the repository. The inventory uses neutral IDs only.

| ID | Type | Captured pages | Event/report dates visible | Layout | Tables | Version/link notes |
| --- | --- | ---: | --- | --- | --- | --- |
| `case-doc-01` | RADIOLOGY | partial 3-page report | exam 2026-08-25; comparison 2026-07-08 | letterhead, repeated identity header, narrative sections | no | original diagnostic mammography/ultrasound; recommends biopsy |
| `case-doc-02` | RADIOLOGY | 2-page report, two overlapping screenshots | exam/report 2026-08-13; references 2026-07-08 imaging | letterhead, narrative | no | outside-imaging interpretation; references recommended biopsy |
| `case-doc-03` | RADIOLOGY | 2-page report | exam 2026-08-28 | letterhead, narrative | no | post-procedure mammography; references biopsy/clip |
| `case-doc-04` | PATHOLOGY | 3-page report, three overlapping screenshots | collected/received 2026-08-25; final/addenda 2026-08-27 | pathology narrative + synoptic biomarker table | yes | original with addenda and biomarker results |
| `case-doc-05` | PROCEDURE | partial 3-page report | procedure 2026-08-25; addendum 2026-08-27 | letterhead, narrative | no | biopsy procedure with pathology-results addendum; references pathology |

The screenshots contain repeated direct patient identifiers in headers/footers. They are therefore not eligible for Git fixtures. Page counts above describe the logical report shown by the viewer; captured screenshots are not canonical page images and some are partial/overlapping.

## B. Consent/legal-scope note

The task states that the owner reports signed client consent for use within this system task. Codex did not find or verify the consent contract text and makes no broader legal conclusion. The repository's existing PHI production gate remains open; this validation is limited to the named processor and isolated task, with no public distribution or production pipeline activation.

## C. Classification results

Local visual inventory yields three RADIOLOGY reports, one PATHOLOGY report with BIOMARKER table/addenda, and one PROCEDURE report. No classic LAB report is present. The implemented classification metadata is independent of diagnosis and Case state.

## D. Google Document AI processing results

All 8/8 source screenshots returned HTTP/process success from processor `2ca773b0daa15488`. Document AI treated each screenshot as one page: 8 pages, 23,002 extracted characters and 4,212 tokens. Mean token confidence by screenshot ranged from 0.95 to 0.98; image-quality score ranged from 0.98 to 0.99. Mean latency was 1,661.625 ms/screenshot. Estimated list-price input is $0.012 for eight pages; actual invoiced cost was not available.

Bounding polygons were present for all 46 matched Gold facts. No table objects were emitted on any screenshot, including the visually tabular biomarker pages. This is a confirmed layout/table extraction gap, not evidence that the table is absent.

## E–H. Extraction audits

- Radiology: modality, dates, findings, measurements/laterality, BI-RADS and recommendations matched 100% of the minimized Gold targets.
- Procedure: procedure/site, sample/clip source statements and recommendation targets matched 100%.
- Pathology: 6/7 targets matched. The mitotic-score source fact was missed by OCR/pattern extraction and is classified as `OCR failure` pending a minimized regression fixture.
- Biomarkers: 5/5 ER/PR/HER2 targets matched as source-reported facts with token provenance, but table structure was lost and must not be treated as a reliable row/column parse.

No prose finding was converted into an AI diagnosis and no medical interpretation was produced.

## I–J. Timeline and linkage

The visible source dates support a technical sequence from prior imaging to diagnostic imaging, biopsy/procedure, pathology final/addenda and post-procedure imaging. Printed dates remain distinct from event dates. Candidate deterministic links are recommendation → biopsy, biopsy → pathology, pathology → biomarker addendum, and addendum → parent report. Final accuracy requires OCR provenance and Gold verification; no causality is asserted.

## K–M. Schema audit and implementation

`canonical_lab_facts` covers none of the non-lab narrative facts in this Case and should not be expanded to absorb them. A minimal Clinical Evidence layer was added in `lib/clinical-evidence` with classification, source-fact parsing, conservative verification, timeline and explicit-link utilities. The service-only migration is repository-only and was not applied.

## N–P. Gold truth and benchmark

The minimized Gold subset contains 47 source-grounded facts. Forty-six matched (97.8723% recall); missed-fact rate is 2.1277%. Document classification was 5/5, provenance availability 46/46, and three deliberately ambiguous/limited targets routed to `NEEDS_REVIEW` (3/3). No false VERIFIED item was observed in the matched Gold set. Category detail and OCR counts are in `output/ankh-benchmark/real-clinical-case-summary.json`.

The full coordinate-backed minimized artifact contains neutral document/fact IDs, capture/page references, bounding polygons, confidence and expected route. It is stored privately in Cloud Shell at `/home/pythonmethodcenter/ankh-real-benchmark-full.json`; it contains neither direct identifiers nor raw document text. The repository copy is metrics-only to minimize clinical information.

Post-run cleanup was verified in Cloud Shell: temporary JPG count `0`, raw-response count `0`, temporary benchmark-script count `0`, and temporary benchmark-JSON count `0`. The retained Gold artifact is 19,168 bytes, mode `600`, with SHA-256 prefix `31e6ec2b627310d0`.

## Q–W. Current recommendation

The audit found a schema gap for non-lab evidence and added the minimal layer plus PHI-free regression coverage. Source images remain outside Git; raw responses will not be logged or committed. Production migration, production auto-processing, Ankh interpretation, Karen UI/decision and client response remain disabled.

Current recommendation: **NO-GO for Phase 3 production use**. The real OCR run proves strong text-level coverage on this single Case but also proves a systematic table-structure gap and one missed pathology fact. One Case cannot establish general accuracy, and the PHI/security/compliance gate remains open.

Exact next action: add a safely minimized regression fixture for the missed pathology score and biomarker table, implement/verify layout-aware table fallback, then rerun this 47-fact benchmark plus a broader approved multi-layout Case set before a Phase 3 GO decision.
