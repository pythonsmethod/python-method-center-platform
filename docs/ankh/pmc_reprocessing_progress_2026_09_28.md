# PMC staff reprocessing progress — 2026-09-28

## A–D. Baseline, change, files and data

The live PMC document chain checkpoints the header and each PDF page. The
staff form previously sent only one process request per file and counted any
non-idle result as a completed document. Three multi-step PDFs could therefore
show a false completion message while their jobs were still queued. The form
also gave the old action result precedence over a new resume click.

`ReprocessCaseDocumentsForm.tsx` now drains a bounded sequence of Case-scoped
requests. Only `ready` counts as a finished file; `continued` advances the
reader without advancing the file count. A scheduled retry, idle queue or
24-request bound leaves an honest pending state with a resume action. A source
requiring attention stops the run, and the operator checks the file status.
The Case page includes both queued and processing documents in the resume
count. `lib/documents/reprocessing-progress.ts` holds the small state machine;
`lib/documents/reprocessing-copy.ts` has paired RU/EN copy. The focused test
adds checkpoint, bounded-resume and stop-state coverage. No schema or data
migration is introduced.

## E–G. Verification, benchmark and boundaries

- 290/290 PMC document-chain tests in 22 files passed.
- TypeScript, targeted ESLint, security self-test/inventory, `git diff --check`
  and production build passed. The existing CSS autoprefixer warning remains.
- The earlier synthetic extraction benchmark was not rerun: this change does
  not alter OCR, fact projection or trust. No medical source, client document
  or provider request was used in this repair.
- The request stays inside the existing staff-authorized Case route. No new
  role, source access, automatic approval, diagnosis or client publication is
  added.

## H–L. Limits, phase and next action

The queue still relies on the existing worker, daily fallback and signed-in
staff access. A UI message does not replace durable document-status readback.
The Production Karen account currently lacks the Karen-only controls in the
observed browser session. Its configuration has not been changed; automatic
approval review blocked entering the proposed email into the Vercel secret
edit form because that would expand sensitive clinical access without an
explicit authorization for that change. One identified real Case is enrolled
but paused, with no new document job, draft, decision or client publication.

This local progress repair is **not released**. GO for publishing the generic
fix after review; NO-GO for reprocessing the pilot Case until the legitimate
Karen role is verified, the repair is deployed, and the specific Case is
resumed. Then use the current source and review workflow, recording source
coverage, disputed rows, the saved decision and client readback separately.
