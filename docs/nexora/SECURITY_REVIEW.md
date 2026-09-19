# NEXORA preview security boundary review

The initial preview build correctly failed the repository's security inventory because the new route was not inventoried and used raw fetch. Do not disable or bypass the checker.

This revision routes model and transcription traffic through `aiFetch`, preserving the shared mandatory AI safety policy, approved fixed OpenAI origin, no redirects, and timeouts. The only new transport endpoint is bounded transcription: three enumerated multipart fields, single approved model, RU/EN language, one audio file <=5 MiB, minimized filename. Existing AI endpoint policies remain unchanged. Authorization, explicit consent and hourly quota are enforced by the caller; the transport alone grants no data access.

The route inventory adds only `app/api/nexora/[action]/route.ts`. Tests cover anonymous/non-owner/unconfirmed/suspended identity, staging-only default, CSRF origin+marker, streamed body limits, malformed input, unsafe links, server-derived identity for settings and feedback, explicit consent and honest missing-key errors. Transcription tests cover field injection, duplicates, model, type and byte limits. SQL integration must additionally verify per-owner and duplicate-outcome rejection.

This is a reviewed preview change, not permission to release the personal hub or clinical processing to production. No security-check suppression or broad network allowlist was added.
