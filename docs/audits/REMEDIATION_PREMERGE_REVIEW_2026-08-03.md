# Remediation Pre-Merge Review — 2026-08-03

Independent review of the remediation branch before merge, per Phase 2.

## Reviewed branch and base

- **Branch:** `claude/pmc-audit-remediation-p0p1p2`
  (head `3f5a098`, seven fix commits `0a58b25 · 2e58177 · 5c328c9 ·
  947f400 · ccf3435 · 296ed0c · ca85a13` + report commit)
- **Base:** `main` @ `f315761`
- **Reviewed diff:** `git diff origin/main..HEAD` — 17 files,
  +1372 / −231 (of which: 5 new test files +434, remediation report +349,
  package-lock +445/−231; substantive app/lib/migration delta ≈ +370).

## Diff summary

| Area | Files | Nature |
|---|---|---|
| Safety pipeline | `lib/assistant/red-flags.ts`, `app/api/assistant/client/route.ts`, new migration | P0-01 + P1-04 |
| Onboarding | `lib/onboarding/actions.ts`, new `lib/onboarding/case-sync.ts` | P1-01 |
| Payments | `lib/payments/stripe.ts`, `app/api/stripe/webhook/route.ts` | P2-01 |
| AI prompts/attachments | `lib/assistant/prompts.ts`, `lib/assistant/claude.ts` | P2-02 + P2-09 |
| Dependencies | `package.json` (overrides), `package-lock.json` | P2-04 |
| Tests | 5 new files, 33 new tests | all findings |
| Docs | remediation report | audit trail |

## Scope verification

Every changed file maps to a claimed finding; no UI, product-logic,
pricing, promo or architecture changes are present. Prices, plans and
promo terms: untouched (verified by diff — no changes under
`lib/config/promo.ts`, `lib/payments/config.ts`, dictionaries). Legal
findings P1-02/P1-03 correctly NOT addressed here. **In scope: PASS.**

## Security review

- **RLS not weakened.** The migration touches no policy. `escalation_events`
  keeps RLS enabled; its only client-facing policy remains SELECT-own
  (`escalation_events_select_own`); the placeholder client INSERT policy was
  already dropped in `20260709120000`. Writes continue to flow through the
  service role only. Dropping NOT NULL widens what the SERVICE ROLE may
  insert; it grants nothing to `anon`/`authenticated`.
- **Service-role surface.** One new use: `syncCaseFromOnboarding()` —
  UPDATE of exactly `title`/`summary` on `client_cases`, predicated on
  `id = <case found via the caller's own profile lookup>` AND
  `profile_id = user.id` from the verified session. The `caseId` is not
  client-supplied: it comes from a lookup scoped to the session's own
  profile earlier in the same action, so a client cannot aim it at another
  case. Zero-row results error out. No client UPDATE policy was added —
  durable case decisions remain staff-owned. **PASS.**
- **Stripe email.** Input normalized (trim/lowercase/@-required); all LIKE
  metacharacters escaped → case-insensitive equality; null → the existing
  manual-review branch. The normalized email also flows into alert lines
  and stored metadata (cosmetic improvement, no behavior risk). **PASS.**
- **Attachment handling.** The envelope adds text blocks only; image, PDF
  and text block construction is unchanged, the person's message remains
  the final block. The batching flow in `AssistantChat` is untouched.
  Attachment framing + prompt rule raise the injection cost; they do not
  claim immunity (probabilistic model) — recorded under residual risk.
  **PASS.**

## Migration review

`20260804150000_guest_escalation_events.sql`: single `ALTER ... DROP NOT
NULL` + column comment. Additive, idempotent, no historical migration
edited. Verified on PostgreSQL 16.13 over the full chain:

- guest inserts for both categories succeed with
  `requires_immediate_review = true`;
- the FK survives: inserting a non-existent profile_id fails with
  `escalation_events_profile_id_fkey`;
- second run of the migration: no error.

Guest rendering re-verified in code: `lib/escalations/queries.ts` uses a
PostgREST left join; `EscalationPanel.tsx:69` renders
`гость сайта (не в системе)`; the founder timeline appends `· гость сайта`
for NULL profile rows. **PASS.**

## Deterministic pattern false-positive review

An adversarial battery (independent of the unit tests, executed against
the patterns extracted from source) over 14 benign phrases and 6 crisis
phrases:

- misses: **0/6**;
- false positives: **1/14** — «не могу дышать полной грудью после
  пробежки» → physical. This is the documented, deliberate bias of the
  design (a spurious alert costs the team ~30 seconds; the event lands in
  the review panel and is closable). Phrases like «хочу жить лучше»,
  «после тренировки болят мышцы», «какие анализы сдать» stay silent.
- Known accepted FP class: idiomatic uses of «не хочу жить …» /
  «боль в груди …» inside benign sentences will escalate. Accepted per the
  audit's own tuning guidance; `signals.detected_by` enables later tuning.

## Regression risk

- Marker-only path: unchanged and covered by a dedicated test.
- Onboarding first submission and case creation: untouched code path;
  duplicate-case protection (lookup-then-update) intact.
- Webhook: signed-in flow (client_reference_id) untouched; only the guest
  email fallback narrowed. Narrowing can only push edge cases toward
  manual review — the fail-safe direction.
- Dependencies: same-major overrides (postcss 8.4→8.5 patch line,
  sharp 0.34→0.35 minor). Validated by clean `npm ci`, full suite and
  production build. Vercel risk is limited to sharp's native install;
  the deployment doc (step 16) carries the observation point and the
  fallback (drop the sharp override only, document advisory as open).
  Note: on Vercel, image optimization is served by Vercel's optimizer, so
  runtime sharp exposure is minimal.

## Test results (final pre-merge gates, clean install)

```
npm ci                 → ok; found 0 vulnerabilities
npm run typecheck      → exit 0 (tsc --noEmit, clean)
npm test               → 19 files, 117 tests, all passed (1.82s)
npm run build          → exit 0 (production build, no new warnings)
npm audit --omit=dev   → found 0 vulnerabilities
```

## Unresolved concerns

1. **Live-behavior closures are unproven by definition** — P2-02/P2-09 pin
   prompt text and block structure, not model obedience; production
   retests 14–15 in the deployment doc are mandatory.
2. **The migration must land in production Supabase** before P0-01 is
   effective; until then guest escalations keep failing exactly as
   audited (code tolerates both states).
3. **Accepted FP class** in deterministic detection (see above) will
   create some noise in the red-flag panel; monitor `detected_by` stats.
4. Overrides are a temporary stance; drop when Next ships fixed pins.

None of these blocks the merge; all are tracked in the deployment doc and
the remediation report.

## PR

- **URL/number:** PR #2 —
  https://github.com/pythonsmethod/python-method-center-platform/pull/2
- Title: `Production acceptance remediation: close P0-01 and scoped P1/P2 defects`

## Merge recommendation

**APPROVE FOR MERGE.**

Conditions attached to (not blocking) the merge: execute
`docs/deployment/PRODUCTION_REMEDIATION_DEPLOYMENT_2026-08-03.md` steps
1–16 in order after merging; the merge itself does not close any finding
and does not constitute GO.
