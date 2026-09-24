# Karen text API and unified Anham knowledge — 2026-09-19

## Owner decision

Karen's typed assistant must work as one API-driven system with deep reasoning, authorised site reading, cross-Case recall and one logical knowledge base. Names of provider implementations are not Karen's workflow. The existing stored-document content-reading integration is explicitly DEFERRED until the document system is complete; reminder scheduled for 2026-09-20 America/Los_Angeles.

## Implemented scope in this branch (not a production acceptance claim)

- Separate typed orchestration endpoint `/api/assistant/karen`, available only to server-authenticated Karen. Existing founder comparison and voice routes are preserved.
- Existing OpenAI Responses adapter with high reasoning and an 8192 output-token budget; up to eight bounded tool rounds. Configured model IDs and keys are unchanged. Explicitly indicated fallback uses the existing alternate adapter and the same authorised tools (its existing four-round limit remains).
- Reuses canonical `assistant_messages`, `assistant_knowledge`, existing site data catalogue, Case context, factual-honesty guard and message persistence. No parallel Case store, no model-side permanent memory.
- Own private dialogue search across all own Cases and dates; authorised Professor/client and support correspondence through site tools, including archived Cases. Other staff members' private assistant conversations stay inaccessible through this new surface. No blanket all-users private-chat export.
- Text reads recheck Karen's real server identity and audit reads. Shared data-helper audit events carry channel=text, not voice.
- New document extraction, stored document content, headers and canonical/staging evidence tools remain unavailable. Inventory metadata and existing human review history are available. Explicitly attached-file handling is delegated to the existing route, not expanded.
- One confirmation panel writes internally to the EXISTING assistant_knowledge table with collection=general, audience=staff and source-Case/author metadata. Historical collections are neither deleted nor moved; Karen can search them together. Retry IDs cannot overwrite other notes. No automatic publication of saved material to clients.
- The existing editable client-message draft and explicit Send workflow remain. No send/write tool is exposed to the model. Similarity to an earlier Case does not establish suitability of its treatment or dosage; Karen reviews the recipient and adapted text. Other clients' identifiers must not be included in outgoing drafts.

## Verification and remaining gates

Remote CI and hosted preview checks must pass before merge. Synthetic tests cover role denial, private-history ownership, document-content gate, audit failure, unified storage and note-size/idempotency rules. No real patient documents or correspondence are used in these tests.

A READY deployment is not authenticated Karen browser acceptance. That gate must verify RU/EN, reopening history, cross-Case lookup from a synthetic Case, knowledge-save receipt/readback, and recipient/text review before sending. Do not report that gate as passed without performing it. No production migrations, role promotions, account-password changes, or clinical trust promotion are part of this release.

## Deferred document acceptance (point 3)

After the owner completes the proper document-reading pipeline, separately verify that Anham reads the contents of already uploaded files, not merely filenames; includes actual source/page/date coverage and unreadable fields; distinguishes source facts, drafts and Karen decisions; and never fabricates missing values. Until that separate gate passes, do not enable a shortcut reading path.
