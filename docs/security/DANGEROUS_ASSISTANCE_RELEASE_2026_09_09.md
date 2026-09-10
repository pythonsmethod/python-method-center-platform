# Dangerous-assistance safety release — 2026-09-09

A. Before: existing shared prompt prohibited harm in broad terms.
B. Change: explicit RU/EN restrictions on malware, credential theft, explosives, weapons, poisons and dangerous biological agents, including disguised/fragmented requests. Preserve legitimate defensive help, victim support and neutral clinical references. Shared platformContext is reused by text and current voice paths.
C. Files: lib/assistant/prompts.ts; tests/assistant-harm-prevention-policy.test.ts; this report and project state records.
D. Schema/data: none.
E. Validation on current-main b18a898: 1573/1573 tests, 170 files. Added voice coverage separately: 69/69 safety and realtime tests. TypeScript, ESLint, diff-check pass. Initial new fixture used an incorrect tier type; corrected to registered and TypeScript rerun successfully. Remote build and deployment verification pending.
F. Synthetic benchmark: 100% critical match, precision, review recall and provenance; zero critical errors/false VERIFIED. No clinical changes.
G. No PHI transmitted, no new permissions or paid model evaluation. No dangerous operational content generated.
H. Prompt rules are not deterministic guarantees against jailbreaks. Live adversarial evaluation remains separate. Existing dependency lock preserved; broader cost/security work is not part of this scoped release.
I. Not included: paused Realtime implementation from older branch, expense dashboard, SMS MFA, restore, dependency updates or migrations.
J. Implementation tested; publication pending.
K. GO for owner-authorized scoped publication; no claim of total attack immunity.
L. Next: publish PR, verify remote build then production deployment for the exact commit.

## Production acceptance
PR #166 merged as 5a5b2d321083406c6f9058f3a63bd7811a05ccf2. Preview dpl_53HjTTmjKXvG1P1Q1r7NKqoMqdch READY; production dpl_6uuFt6TGGV1c7346axeoP8AyNbjn READY and assigned pythonmethodcenter.com/www on 2026-09-10 UTC. HTTP /, /en and login return 200; empty realtime session request returns 400 without model work. Separate anham-mobile-app preview failed because its configured root has no Next dependency; the canonical web project built successfully. Publication phase CLOSED. GO for this scoped release; no live adversarial-model guarantee. Existing voice sessions should be restarted to receive new instructions. Broader security/cost dashboard, MFA and restore remain outside this release.
