# Support, shop and pricing release — 2026-09-06

Owner approved publication of all latest RU/EN changes: remove two shop panels; use one public support form for guests and authenticated visitors; require email, phone and message on client/server; preserve phone in the request body; add $180 delivery to 100-day support ($3,855 total); remove remaining promotional wording. Preserve current paid $500 review card and locale-aware production routes.

Files: public shop and support pages, PublicSupportForm, support validation/action, payment config, RU/EN dictionary, assistant pricing copy, offer/refund content and related tests. No schema migrations. Phone uses existing request body storage; email retains contact_email. No test requests or PHI transmitted. Stripe Payment Link amounts remain owner-managed and were not changed.

Offer edition incremented to oferta-v7; v6 fingerprint retained. Initial two test failures covered stale total and unchanged contract fingerprint, corrected with new-version assertions. Full rerun: 972/972 tests, 123 files PASS. Typecheck and lint PASS; build validation recorded at publication. Existing synthetic benchmark reported zero critical errors, not general clinical validation. Generated benchmark output excluded. No physical-device tests. GO for approved deployment; next action public RU/EN verification and owner Stripe total update to $3,855.
Production build PASS: 51/51 generated pages.
