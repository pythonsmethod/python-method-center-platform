# Approved homepage publication — 2026-09-06

Based on production 59d8194. Publishes the approved app promotion, Anham card CTA and reassurance, removal of quick cards, circular journey without caption, gilded heading, revised RU/EN lead, and top single-row mobile navigation. Preserves current production locale links, paid review configuration, authentication and backend.

Changed: public homepage/style files, HomeAppPromo/HomeJourney, PublicMobileDock, root layout navigation position, two dictionary strings. No schema, data, payment or PHI changes. No migrations applied.

Validation: typecheck PASS; ESLint PASS; relevant tests 8/8 PASS; full suite 968/968 across 123 files PASS; production build 51/51 pages PASS. Initial sandbox font download failed EACCES; network-enabled retry passed. Synthetic benchmark run by existing tests reports zero critical errors; no clinical validation claim. Browser review of the local design in RU/EN completed in the preceding task. Physical-device checks not performed.

GO for approved deployment. Other uncommitted workspace tasks and generated benchmark outputs excluded. Next action: verify hosted deployment and homepage.
